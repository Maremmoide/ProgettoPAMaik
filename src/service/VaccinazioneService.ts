import {vaccinazioneDao} from "../dao/VaccinazioneDao";
import {lottoVaccinoDao} from "../dao/LottoVaccinoDao";
import {AppErrorsName} from "../enum/AppErrorsName";
import { VaccinazioneAttributes } from "../model/Vaccinazione";
import PDFDocument from "pdfkit";
import { userDao } from "../dao/UserDao";
import redis from "../config/redis";
import { randomUUID } from "crypto";
import { sequelize } from "../connector/connector";


/*
    * Interfaccia per i dati di input necessari per creare una nuova vaccinazione.
    * Contiene il codice fiscale dell'utente, l'ID del lotto, l'ID del vaccino e la data della vaccinazione.
    */

interface CreateVaccinazioneInput {
    user_cf: string;
    lotto_id: number;
    vaccino_id: number;
    data_vaccinazione: Date;
}

/*
    * Interfaccia per rappresentare il risultato del report sulla copertura vaccinale.
    * Contiene informazioni sulla vaccinazione, l'utente, il vaccino, le date di vaccinazione e fine copertura, la differenza in giorni e lo stato della copertura.
    */

interface CoperturaResult {
    vaccinazioneId: number;
    userCf: string;
    vaccino: string;
    dataVaccinazione: Date;
    fineCopertura: Date;
    giorniDifferenza: number;
    statoCoperura: "attiva" | "scaduta";
}


/*    * Classe di servizio per la gestione delle operazioni relative alle vaccinazioni.
    * Fornisce metodi per creare, leggere, aggiornare e cancellare vaccinazioni, generare report PDF e gestire codici di copertura.
    */

export class VaccinazioneService {

    /*
        * Crea un codice di copertura per un utente specifico e lo memorizza in Redis con un tempo di vita limitato.
        * @param cf - Il codice fiscale dell'utente per il quale generare il codice di copertura inserito nella query.
        * @param ttlMinutes - Il tempo di vita del codice in minuti (default: 10 minuti).
        * @returns Una Promise che risolve con il codice di copertura generato.
        * Nota: Il codice generato è un UUID casuale e viene memorizzato in Redis con una chiave formattata come "copertura:<code>".
        */
    async createCoperturaCode(cf: string, ttlMinutes: number = 10): Promise<string> {
        const code = randomUUID();

        await redis.set(
            `copertura:${code}`,
            cf,
            { EX: ttlMinutes * 60 }
        );

        return code;
    }

    async createVaccinazione(data: CreateVaccinazioneInput) {
        return sequelize.getSequelize().transaction(async (t) => {
            const disponibile = await lottoVaccinoDao.decrementQuantitaIfAvailable(
                data.lotto_id,
                { transaction: t }
            );
 
            if (!disponibile) {
                const err = new Error("Nessuna dose disponibile in questo lotto");
                err.name = AppErrorsName.DISPONIBILITA_VACCINO_INSUFFICIENTE;
                throw err;
            }
 
            return vaccinazioneDao.create(
                {
                    userCf: data.user_cf,
                    lottoId: data.lotto_id,
                    vaccinoId: data.vaccino_id,
                    dataVaccinazione: data.data_vaccinazione,
                },
                { transaction: t }
            );
        });
    }

    async getVaccinazioneById(targetId: number) {
        const vaccinazione = await vaccinazioneDao.findById(targetId);
        if (!vaccinazione) {
            const err = new Error("Vaccinazione not found");
            err.name = AppErrorsName.VACCINAZIONE_NOT_FOUND;
            throw err;
        }
        return vaccinazione;
    }

    async getAllVaccinazioni() {
        return vaccinazioneDao.findAll();
    }

    async updateVaccinazione(
        targetId: number,
        updatedData: Partial<VaccinazioneAttributes>
    ) {
        const updatedVaccinazione = await vaccinazioneDao.update({ id: targetId }, updatedData);
        if (!updatedVaccinazione) {
            const err = new Error("Vaccinazione not found");
            err.name = AppErrorsName.VACCINAZIONE_NOT_FOUND;
            throw err;
        }

        return updatedVaccinazione;
    }

    async deleteVaccinazione(targetId: number) {
        const deleted = await vaccinazioneDao.delete(targetId);
        if (!deleted) {
            const err = new Error("Vaccinazione not found");
            err.name = AppErrorsName.VACCINAZIONE_NOT_FOUND;
            throw err;
        }
        return deleted;
    }

/*
    * Genera un PDF con il report delle vaccinazioni di un utente specifico.
    * @param cf - Il codice fiscale dell'utente per il quale generare il report o il report dell'user che lo richiede.
    * @returns Una Promise che risolve con un Buffer contenente il PDF generato.
    * Nota: Se l'utente non viene trovato, viene generato un errore con il nome "USER_NOT_FOUND".
    */

    async generatePdfReport(cf: string): Promise<Buffer> {
        const user = await userDao.findById(cf);

        if (!user) {
            const err = new Error("User not found");
            err.name = AppErrorsName.USER_NOT_FOUND;
            throw err;
        }

        const vaccinazioni = await vaccinazioneDao.findAllByUserCf(cf);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                margin: 50,
                info: {
                    Title: `Vaccinazioni - ${cf}`,
                    Author: "Sistema Gestione Vaccinazioni",
                },
            });

            const chunks: Uint8Array[] = [];

            doc.on("data", (chunk: Uint8Array) => {
                chunks.push(chunk);
            });

            doc.on("end", () => {
                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const result = new Uint8Array(totalLength);

                let offset = 0;
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }

                resolve(Buffer.from(result));
            });

            doc.on("error", reject);

            doc.fontSize(18).text("Report Vaccinazioni", { align: "center" });
            doc.moveDown();
            doc.fontSize(12).text(`Utente: ${user.name}`);
            doc.text(`CF: ${user.cf}`);
            doc.text(`Generato il: ${new Date().toLocaleDateString("it-IT")}`);
            doc.moveDown(2);

            if (vaccinazioni.length === 0) {
                doc.fontSize(12).text("Nessuna vaccinazione registrata.");
            } else {
                const startX = 50;

                const drawTableHeader = (y: number): number => {
                    doc.fontSize(10).font("Helvetica-Bold");

                    doc.text("Vaccino", startX, y, { width: 150 });
                    doc.text("Lotto", startX + 150, y, { width: 100 });
                    doc.text("Data vaccinazione", startX + 250, y, { width: 120 });
                    doc.text("Copertura (gg)", startX + 370, y, { width: 100 });

                    y += 20;

                    doc.moveTo(startX, y).lineTo(startX + 470, y).stroke();

                    doc.font("Helvetica");

                    return y + 10;
                };

                let y = drawTableHeader(doc.y);

                for (const v of vaccinazioni) {
                    if (y > doc.page.height - 80) {
                        doc.addPage();
                        y = drawTableHeader(50);
                    }

                    const dataFormatted = new Date(v.dataVaccinazione).toLocaleDateString("it-IT");

                    doc.text(v.Vaccino?.nome ?? "-", startX, y, { width: 150 });
                    doc.text(v.LottoVaccino?.codiceLotto ?? "-", startX + 150, y, { width: 100 });
                    doc.text(dataFormatted, startX + 250, y, { width: 120 });
                    doc.text(String(v.Vaccino?.durataCopertura ?? "-"), startX + 370, y, { width: 100 });

                    y += 20;
                }
            }

            doc.end();
        });
    }

    /*
    * Ottiene le vaccinazioni filtrate per un utente specifico in base ai parametri forniti.
    * @param cf - Il codice fiscale dell'utente per il quale ottenere le vaccinazioni filtrate nella query.
    * @param filters - Un oggetto contenente i filtri opzionali per il nome del vaccino e le date.
    * @returns Una Promise che risolve con un array di vaccinazioni filtrate dell'utente.
    * Nota: Se l'utente non viene trovato, viene generato un errore con il nome "USER_NOT_FOUND".
    */

    async getFilteredVaccinazioni(cf: string, filters: {
        nomeVaccino?: string;
        dataGt?: string;
        dataLt?: string;
        dataMin?: string;
        dataMax?: string;
    }) {
        const user = await userDao.findById(cf);
        if (!user) {
            const err = new Error("User not found");
            err.name = AppErrorsName.USER_NOT_FOUND;
            throw err;
        }

        return vaccinazioneDao.findFilteredByUserCf(cf, {
            nomeVaccino: filters.nomeVaccino,
            dataGt: filters.dataGt ? new Date(filters.dataGt) : undefined,
            dataLt: filters.dataLt ? new Date(filters.dataLt) : undefined,
            dataMin: filters.dataMin ? new Date(filters.dataMin) : undefined,
            dataMax: filters.dataMax ? new Date(filters.dataMax) : undefined,
        });
    }

    /*
        * Ottiene il report della copertura vaccinale per un utente specifico.
        * @param userCf - Il codice fiscale dell'utente per il quale ottenere il report della copertura vaccinale, oppure undefined per ottenere il report per l'utente corrente.
        * @param order - L'ordine di ordinamento dei risultati, può essere "asc" per ascendente o "desc" per discendente (default: "asc").
        * @returns Una Promise che risolve con un array di risultati del report della copertura vaccinale.
        * Nota: Se l'utente non viene trovato, viene generato un errore con il nome "USER_NOT_FOUND".
        */
    async getCoperturaReport(userCf: string | undefined, order: "asc" | "desc" = "asc"): Promise<CoperturaResult[]> {
        const vaccinazioni = await vaccinazioneDao.findAllWithDetails(userCf);
        const oggi = new Date();

        const results: CoperturaResult[] = vaccinazioni.map((v) => {
            const dataVacc = new Date(v.dataVaccinazione);
            const durata = v.Vaccino!.durataCopertura;

            const fineCopertura = new Date(dataVacc);
            fineCopertura.setDate(fineCopertura.getDate() + durata);

            const msDiff = fineCopertura.getTime() - oggi.getTime();
            const giorniDifferenza = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

            return {
                vaccinazioneId: v.id,
                userCf: v.userCf,
                vaccino: v.Vaccino!.nome,
                dataVaccinazione: dataVacc,
                fineCopertura,
                giorniDifferenza,
                statoCoperura: giorniDifferenza >= 0 ? "attiva" : "scaduta",
            };
        });

        results.sort((a, b) =>
            order === "asc" ? a.giorniDifferenza - b.giorniDifferenza : b.giorniDifferenza - a.giorniDifferenza
        );

        return results;
    }


/*    * Ottiene il report della copertura vaccinale per un utente specifico in formato PDF.
    * @param cf - Il codice fiscale dell'utente per il quale ottenere il report della copertura vaccinale in formato PDF.
    * @param order - L'ordine di ordinamento dei risultati, può essere "asc" per ascendente o "desc" per discendente (default: "asc").
    * @returns Una Promise che risolve con un Buffer contenente il PDF generato.
    * Nota: Se l'utente non viene trovato, viene generato un errore con il nome "USER_NOT_FOUND".
    */

    async generateCoperturaPdf(cf: string, order: "asc" | "desc" = "asc"): Promise<Buffer> {
        const user = await userDao.findById(cf);

        if (!user) {
            const err = new Error("User not found");
            err.name = AppErrorsName.USER_NOT_FOUND;
            throw err;
        }

        const vaccinazioni = await vaccinazioneDao.findAllByUserCf(cf);

        const oggi = new Date();

        vaccinazioni.sort((a, b) => {
            const fineA = new Date(a.dataVaccinazione);
            fineA.setDate(fineA.getDate() + (a.Vaccino?.durataCopertura ?? 0));

            const fineB = new Date(b.dataVaccinazione);
            fineB.setDate(fineB.getDate() + (b.Vaccino?.durataCopertura ?? 0));

            const giorniA = Math.ceil((fineA.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
            const giorniB = Math.ceil((fineB.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));

            return order === "asc" ? giorniA - giorniB : giorniB - giorniA;
        });

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                margin: 50,
                info: {
                    Title: `Copertura Vaccinale - ${cf}`,
                    Author: "Sistema Gestione Vaccinazioni",
                },
            });

            const chunks: Uint8Array[] = [];

            doc.on("data", (chunk: Uint8Array) => {
                chunks.push(chunk);
            });

            doc.on("end", () => {
                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const result = new Uint8Array(totalLength);

                let offset = 0;
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }

                resolve(Buffer.from(result));
            });

            doc.on("error", reject);

            doc.fontSize(18).text("Report Copertura Vaccinale", { align: "center" });
            doc.moveDown();
            doc.fontSize(12).text(`Utente: ${user.name}`);
            doc.text(`CF: ${user.cf}`);
            doc.text(`Generato il: ${new Date().toLocaleDateString("it-IT")}`);
            doc.text(`Ordinamento: ${order.toUpperCase()}`);
            doc.moveDown(2);

            if (vaccinazioni.length === 0) {
                doc.text("Nessuna vaccinazione registrata.");
            } else {
                const startX = 50;

                const drawTableHeader = (y: number): number => {
                    doc.fontSize(10).font("Helvetica-Bold");

                    doc.text("Vaccino", startX, y, { width: 120 });
                    doc.text("Data", startX + 120, y, { width: 90 });
                    doc.text("Fine copertura", startX + 210, y, { width: 110 });
                    doc.text("Giorni", startX + 320, y, { width: 70 });
                    doc.text("Stato", startX + 390, y, { width: 80 });

                    y += 20;

                    doc.moveTo(startX, y).lineTo(startX + 470, y).stroke();

                    doc.font("Helvetica");

                    return y + 10;
                };

                let y = drawTableHeader(doc.y);

                for (const v of vaccinazioni) {
                    if (y > doc.page.height - 80) {
                        doc.addPage();
                        y = drawTableHeader(50);
                    }

                    const dataVacc = new Date(v.dataVaccinazione);

                    const fineCopertura = new Date(dataVacc);
                    fineCopertura.setDate(fineCopertura.getDate() + (v.Vaccino?.durataCopertura ?? 0));

                    const giorniDifferenza = Math.ceil((fineCopertura.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));

                    const stato = giorniDifferenza >= 0 ? "attiva" : "scaduta";

                    doc.text(v.Vaccino?.nome ?? "-", startX, y, { width: 120 });
                    doc.text(dataVacc.toLocaleDateString("it-IT"), startX + 120, y, { width: 90 });
                    doc.text(fineCopertura.toLocaleDateString("it-IT"), startX + 210, y, { width: 110 });
                    doc.text(giorniDifferenza.toString(), startX + 320, y, { width: 70 });
                    doc.text(stato, startX + 390, y, { width: 80 });

                    y += 20;
                }
            }

            doc.end();
        });
    }
}

export const vaccinazioneService = new VaccinazioneService();
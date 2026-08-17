import { IDao } from "./IDao";
import { Op, fn, col, WhereOptions, WhereOperators } from "sequelize";
import {
    Vaccino,
    VaccinoAttributes,
    VaccinoCreationAttributes
} from "../model/Vaccino";
import { LottoVaccino, LottoVaccinoAttributes } from "../model/LottoVaccino";
import { Vaccinazione } from "../model/Vaccinazione";

/*
    * Filtri opzionali accettati da searchVaccini. Arrivano tipicamente da req.query,
    * quindi ogni valore è la stringa così come ricevuta dalla querystring.
    */
export interface VaccinoSearchFilters {
    nome?: string;
    scadenzaMaggioreDi?: string;
    scadenzaMinoreDi?: string;
    disponibilitaMin?: string;
    disponibilitaMax?: string;
}


/*
    * Classe DAO per la gestione delle operazioni CRUD sui vaccini.
    * Implementa l'interfaccia IDao per i vaccini.
    * Fornisce metodi per creare, leggere, aggiornare e cancellare vaccini, nonché per trovare vaccini filtrati e statistiche sui vaccini.
    */


export class VaccinoDao implements IDao<Vaccino> {

    async read(item: Vaccino): Promise<Vaccino | null> {
        return Vaccino.findByPk(item.id);
    }

    async create(
        vaccino: VaccinoCreationAttributes
    ): Promise<Vaccino> {
        return Vaccino.create(vaccino);
    }

    async findByNome(
        nome: string
    ): Promise<Vaccino | null> {
        return Vaccino.findOne({
            where: { nome }
        });
    }

    async findById(
        id: number
    ): Promise<Vaccino | null> {
        return Vaccino.findByPk(id);
    }

    async findAll(): Promise<Vaccino[]> {
        return Vaccino.findAll();
    }


/*
    * Cerca i vaccini in base ai filtri forniti.
    * @param filters - Un oggetto contenente i filtri opzionali per il nome del vaccino, la disponibilità e le date di scadenza dei lotti.
    * @returns Un array di vaccini che soddisfano i criteri di ricerca, con la disponibilità totale calcolata per ciascun vaccino.
*/

    async searchVaccini(filters: VaccinoSearchFilters) {

        // ======================
        // FILTRO NOME
        // ======================

        const nome: WhereOperators<string> | undefined = filters.nome
            ? { [Op.in]: filters.nome.split(",").map((n) => n.trim()) }
            : undefined;

        const whereVaccino: WhereOptions<VaccinoAttributes> = {
            ...(nome && { nome }),
        };

        // ======================
        // FILTRO SCADENZA
        // ======================

        let dataScadenza: WhereOperators<Date> | undefined;

        if (
            filters.scadenzaMaggioreDi &&
            filters.scadenzaMinoreDi
        ) {

            dataScadenza = {
                [Op.between]: [
                    new Date(filters.scadenzaMaggioreDi),
                    new Date(filters.scadenzaMinoreDi)
                ]
            };

        } else if (filters.scadenzaMaggioreDi) {

            dataScadenza = {
                [Op.gte]: new Date(filters.scadenzaMaggioreDi)
            };

        } else if (filters.scadenzaMinoreDi) {

            dataScadenza = {
                [Op.lte]: new Date(filters.scadenzaMinoreDi)
            };
        }

        const whereLotto: WhereOptions<LottoVaccinoAttributes> = {
            ...(dataScadenza && { dataScadenza }),
        };

        const vaccini = await Vaccino.findAll({

            where: whereVaccino,

            include: [
                {
                    model: LottoVaccino,
                    as: "lotti",
                    attributes: [],
                    where: whereLotto,
                    required: true
                }
            ],

            attributes: {
                include: [
                    [
                        fn(
                            "COALESCE",
                            fn(
                                "SUM",
                                col("lotti.quantita_disponibile")
                            ),
                            0
                        ),
                        "disponibilitaTotale"
                    ]
                ]
            },

            group: ["Vaccino.id"]
        });

        // ======================
        // FILTRO DISPONIBILITÀ
        // ======================

        const disponibilitaMin =
            filters.disponibilitaMin !== undefined
                ? Number(filters.disponibilitaMin)
                : undefined;

        const disponibilitaMax =
            filters.disponibilitaMax !== undefined
                ? Number(filters.disponibilitaMax)
                : undefined;

        let result = vaccini;

        // maggiore di k

        if (
            disponibilitaMin !== undefined &&
            disponibilitaMax === undefined
        ) {
            result = result.filter(
                (v) =>
                    Number(
                        v.get("disponibilitaTotale")
                    ) >= disponibilitaMin
            );
        }

        // minore di k

        if (
            disponibilitaMax !== undefined &&
            disponibilitaMin === undefined
        ) {
            result = result.filter(
                (v) =>
                    Number(
                        v.get("disponibilitaTotale")
                    ) <= disponibilitaMax
            );
        }

        // compreso tra k1 e k2

        if (
            disponibilitaMin !== undefined &&
            disponibilitaMax !== undefined
        ) {
            result = result.filter(
                (v) => {

                    const q = Number(
                        v.get("disponibilitaTotale")
                    );

                    return (
                        q >= disponibilitaMin &&
                        q <= disponibilitaMax
                    );
                }
            );
        }

        return result;
    }


/*
    * Ottiene le statistiche sui vaccini, inclusi i dati sulle vaccinazioni e la disponibilità dei lotti.
    * @returns Un array di oggetti contenenti le statistiche per ciascun vaccino, inclusi il nome del vaccino, la media delle dosi consegnate e le statistiche mensili delle vaccinazioni.
    */

    async getStatisticheVaccini() {

        const vaccini = await Vaccino.findAll({

            include: [

                {
                    model: Vaccinazione,
                    attributes: [
                        "dataVaccinazione"
                    ]
                },

                {
                    model: LottoVaccino,
                    as: "lotti",
                    attributes: [
                        "quantitaDisponibile"
                    ]
                }
            ]
        });

        return vaccini.map((vaccino) => {

            // conta vaccinazioni per mese/anno

            const conteggi: Record<number, Record<number, number>> = {};

            for (const vaccinazione of vaccino.Vaccinaziones ?? []) {

                const data = new Date(vaccinazione.dataVaccinazione);

                const mese = data.getMonth() + 1;
                const anno = data.getFullYear();

                if (!conteggi[mese]) {
                    conteggi[mese] = {};
                }

                conteggi[mese][anno] =
                    (conteggi[mese][anno] ?? 0) + 1;
            }

            const statisticheMensili = Object.entries(conteggi).map(

                ([mese, anni]) => {

                    const valori = Object.values(anni);

                    const min = Math.min(...valori);

                    const max = Math.max(...valori);

                    const media =
                        valori.reduce((a, b) => a + b, 0) /
                        valori.length;

                    const deviazione =
                        Math.sqrt(

                            valori.reduce(

                                (somma, valore) =>
                                    somma +
                                    Math.pow(
                                        valore - media,
                                        2
                                    ),

                                0
                            ) / valori.length
                        );

                    return {

                        mese: Number(mese),

                        min,

                        max,

                        media: Number(
                            media.toFixed(2)
                        ),

                        deviazioneStandard: Number(
                            deviazione.toFixed(2)
                        )
                    };
                }
            );

            // ==========================
            // MEDIA DOSI CONSEGNATE
            // ==========================

            const lotti = vaccino.lotti ?? [];

            const mediaConsegnate =

                lotti.length === 0

                    ? 0

                    : Number(

                        (

                            lotti.reduce(

                                (somma: number, lotto) =>
                                    somma +
                                    lotto.quantitaDisponibile,

                                0
                            ) /

                            lotti.length

                        ).toFixed(2)
                    );

            return {

                id: vaccino.id,

                nome: vaccino.nome,

                mediaDosiConsegnate: mediaConsegnate,

                statisticheMensili
            };
        });
    }

    async update(
        item: Partial<VaccinoAttributes>,
        updatedVaccino: Partial<VaccinoAttributes>
    ): Promise<Vaccino | null> {

        const vaccino = await Vaccino.findByPk(item.id);

        if (!vaccino) {
            return null;
        }

        await vaccino.update(updatedVaccino);

        return vaccino;
    }

    async delete(id: number): Promise<boolean> {

        const vaccino = await Vaccino.findByPk(id);

        if (!vaccino) {
            return false;
        }

        await vaccino.destroy();

        return true;
    }
}

export const vaccinoDao = new VaccinoDao();
import { Request, Response } from "express";
import { vaccinazioneService } from "../service/VaccinazioneService";
import { AppErrorsName } from "../enum/AppErrorsName";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";
import { AppSuccessMessage } from "../enum/AppSuccessMessage";
import redis from "../config/redis";

export class VaccinazioneController {

    /*
        * Recupera la copertura vaccinale di un utente in base al codice di accesso Redis.
        * @param req - La richiesta HTTP contenente il codice di accesso.
        * @param res - La risposta HTTP che conterrà la copertura vaccinale o un messaggio di errore.
        */

    async getCoperturaByCode(req: Request, res: Response): Promise<void> {
        try {
            const code =
                (req.query.code as string) ||
                (req.headers["x-access-code"] as string) ||
                (req.body?.code as string);

            if (!code) {
                res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
                return;
            }

            const cf = await redis.get(`copertura:${code}`);

            if (!cf) {
                res.status(401).json({ error: AppErrorsMessage.INVALID_TOKEN });
                return;
            }

            const order = (req.query.order as string) === "desc" ? "desc" : "asc";

            const report = await vaccinazioneService.getCoperturaReport(cf, order);

            res.status(200).json(report);
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }


    /* 
        * Genera un codice di accesso per la copertura vaccinale.
        * @param req - La richiesta HTTP contenente l'utente target nel body della richiesta.
        * @param res - La risposta HTTP che conterrà il codice di accesso o un messaggio di errore.
        */

    async generateCoperturaCode(req: Request, res: Response): Promise<void> {
        try {
            const targetUser = req.targetUser!;
            const cf = targetUser.cf;

            const code = await vaccinazioneService.createCoperturaCode(cf, 10);

            res.status(200).json({
                code,
                cf,
                expiresIn: 600
            });
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    /*
        * Crea una nuova vaccinazione.
        * @param req - La richiesta HTTP contenente i dati della vaccinazione.
        * @param res - La risposta HTTP che conterrà la vaccinazione creata o un messaggio di errore.
        */
    async createVaccinazione(req: Request, res: Response): Promise<void> {
        try {
            const targetUser = req.targetUser!;
            const lotto = req.lotto!;
            const vaccino = req.vaccino!;
            const dataVaccinazione = req.dataVaccinazione!;
 
            const vaccinazione = await vaccinazioneService.createVaccinazione({
                user_cf: targetUser.cf,
                lotto_id: lotto.id,
                vaccino_id: vaccino.id,
                data_vaccinazione: dataVaccinazione,
            });
 
            res.status(201).json({ message: AppSuccessMessage.VACCINAZIONE_CREATED, vaccinazione });
        } catch (error) {
            if (error instanceof Error && error.name === AppErrorsName.DISPONIBILITA_VACCINO_INSUFFICIENTE) {
                res.status(409).json({ error: AppErrorsMessage.DISPONIBILITA_VACCINO_INSUFFICIENTE });
                return;
            }
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    
    /*
        * Recupera una vaccinazione specifica in base al suo ID.
        * @param req - La richiesta HTTP contenente l'ID della vaccinazione.
        * @param res - La risposta HTTP che conterrà la vaccinazione o un messaggio di errore.
        */

    async getVaccinazioneById(req: Request, res: Response): Promise<void> {
        try {
            const targetId = Number(req.params.id);
            const vaccinazione = await vaccinazioneService.getVaccinazioneById(targetId);
            res.status(200).json(vaccinazione);
        } catch (error) {
            if (error instanceof Error && error.name === AppErrorsName.VACCINAZIONE_NOT_FOUND) {
                res.status(404).json({ error: AppErrorsMessage.VACCINAZIONE_NOT_FOUND });
            } else {
                res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
            }
        }
    }
    
    /*
        * Recupera tutte le vaccinazioni.
        * @param req - La richiesta HTTP.
        * @param res - La risposta HTTP che conterrà l'elenco delle vaccinazioni o un messaggio di errore.
        */
    async getAllVaccinazioni(req: Request, res: Response): Promise<void> {
        try {
            const vaccinazioni = await vaccinazioneService.getAllVaccinazioni();
            res.status(200).json(vaccinazioni);
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    
    /*
        * Aggiorna una vaccinazione specifica in base al suo ID.
        * @param req - La richiesta HTTP contenente l'ID della vaccinazione e i dati aggiornati nel corpo della richiesta.
        * @param res - La risposta HTTP che conterrà la vaccinazione aggiornata o un messaggio di errore.
        */
    async updateVaccinazione(req: Request, res: Response): Promise<void> {
        try {
            const targetId = Number(req.params.id);
            const vaccinazione = await vaccinazioneService.updateVaccinazione(targetId, req.body);
            res.status(200).json({ message: AppSuccessMessage.VACCINAZIONE_UPDATED, vaccinazione });
        } catch (error) {
            if (error instanceof Error && error.name === AppErrorsName.VACCINAZIONE_NOT_FOUND) {
                res.status(404).json({ error: AppErrorsMessage.VACCINAZIONE_NOT_FOUND });
            } else {
                res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
            }
        }
    }


    /*
        * Elimina una vaccinazione specifica in base al suo ID.
        * @param req - La richiesta HTTP contenente l'ID della vaccinazione.
        * @param res - La risposta HTTP che conterrà un messaggio di conferma o un messaggio di errore.
        */

    async deleteVaccinazione(req: Request, res: Response): Promise<void> {
        try {
            const targetId = Number(req.params.id);
            await vaccinazioneService.deleteVaccinazione(targetId);
            res.status(200).json({ message: AppSuccessMessage.VACCINAZIONE_DELETED });
        } catch (error) {
            if (error instanceof Error && error.name === AppErrorsName.VACCINAZIONE_NOT_FOUND) {
                res.status(404).json({ error: AppErrorsMessage.VACCINAZIONE_NOT_FOUND });
            } else {
                res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
            }
        }
    }
    
    /*
        * Genera un PDF con le informazioni sulla vaccinazione.
        * @param req - La richiesta HTTP, che può contenere il codice fiscale dell'utente target come parametro di query (per admin/operator) o utilizzare il codice fiscale dell'utente autenticato (per user).
        * @param res - La risposta HTTP che conterrà il PDF o un messaggio di errore.
        */
    async pdfVaccinazione(req: Request, res: Response): Promise<void> {
        try {
            const requester = req.user!;
            const isAdmin = requester.roles?.includes("admin") || requester.roles?.includes("operator");

            let targetCf: string;

            if (isAdmin) {
                const cfParam = req.query.cf as string;
                if (!cfParam) {
                    res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
                    return;
                }
                targetCf = cfParam;
            } else {
                targetCf = requester.cf;
            }

            const pdfBuffer = await vaccinazioneService.generatePdfReport(targetCf);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="vaccinazioni_${targetCf}.pdf"`);

            res.status(200).send(pdfBuffer);
        } catch (error) {
            if (error instanceof Error && error.name === AppErrorsName.USER_NOT_FOUND) {
                res.status(404).json({ error: AppErrorsMessage.USER_NOT_FOUND });
            } else {
                res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
            }
        }
    }

    /*
        * Recupera le vaccinazioni filtrate in base ai parametri forniti.
        * @param req - La richiesta HTTP contenente i parametri di filtro come query string.
        * @param res - La risposta HTTP che conterrà le vaccinazioni filtrate o un messaggio di errore.
        */

    async getFilteredVaccinazioni(req: Request, res: Response): Promise<void> {
        try {
            const requester = req.user!;
            const isAdmin = requester.roles?.includes("admin") || requester.roles?.includes("operator");

            let targetCf: string;
            if (isAdmin) {
                const cfParam = req.query.cf as string;
                if (!cfParam) {
                    res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
                    return;
                }
                targetCf = cfParam;
            } else {
                targetCf = requester.cf;
            }

            const { nomeVaccino, dataGt, dataLt, dataMin, dataMax } = req.query;

            const vaccinazioni = await vaccinazioneService.getFilteredVaccinazioni(targetCf, {
                nomeVaccino: nomeVaccino as string,
                dataGt: dataGt as string,
                dataLt: dataLt as string,
                dataMin: dataMin as string,
                dataMax: dataMax as string,
            });

            res.status(200).json(vaccinazioni);
        } catch (error) {
            if (error instanceof Error && error.name === AppErrorsName.USER_NOT_FOUND) {
                res.status(404).json({ error: AppErrorsMessage.USER_NOT_FOUND });
            } else {
                res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
            }
        }
    }

    /*
        * Recupera un report sulla copertura vaccinale.
        * @param req - La richiesta HTTP, che può contenere il codice fiscale dell'utente target come parametro di query (per admin/operator) o utilizzare il codice fiscale dell'utente autenticato (per user).
        * @param res - La risposta HTTP che conterrà il report o un messaggio di errore.
        */

    async getCoperturaReport(req: Request, res: Response): Promise<void> {
        try {
            const requester = req.user!;
            const isAdmin = requester.roles?.includes("admin") || requester.roles?.includes("operator");

            // admin: vede tutti (a meno che non passi un cf specifico in query, opzionale)
            // user: vede solo le proprie
            const targetCf = isAdmin ? (req.query.cf as string | undefined) : requester.cf;

            const order = (req.query.order as string) === "desc" ? "desc" : "asc";

            const report = await vaccinazioneService.getCoperturaReport(targetCf, order);
            res.status(200).json(report);
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    /*
        * Genera un PDF con il report sulla copertura vaccinale.
        * @param req - La richiesta HTTP, che può contenere il codice fiscale dell'utente target come parametro di query (per admin/operator) o utilizzare il codice fiscale dell'utente autenticato (per user).
        * @param res - La risposta HTTP che conterrà il PDF o un messaggio di errore.
        */

    async getCoperturaPdf(req: Request, res: Response): Promise<void> {
        try {
            const requester = req.user!;
            const isAdmin = requester.roles?.includes("admin") || requester.roles?.includes("operator");

            const targetCf = isAdmin ? (req.query.cf as string | undefined) : requester.cf;
            const order = (req.query.order as string) === "desc" ? "desc" : "asc";

            if (!targetCf) {
                res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
                return;
            }

            const pdfBuffer = await vaccinazioneService.generateCoperturaPdf(targetCf, order);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="copertura_${targetCf}.pdf"`);

            res.send(pdfBuffer);
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }
}

export const vaccinazioneController = new VaccinazioneController();
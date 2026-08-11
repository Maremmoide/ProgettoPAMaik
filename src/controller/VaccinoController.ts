import { Request, Response } from "express";
import { vaccinoService } from "../service/VaccinoService";
import { VaccinoSearchFilters } from "../dao/VaccinoDao";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";
import { AppSuccessMessage } from "../enum/AppSuccessMessage";

export class VaccinoController {

    /*
        * Crea un nuovo vaccino.
        * @param req - La richiesta HTTP contenente i dati del vaccino nel corpo della richiesta.
        * @param res - La risposta HTTP che conterrà il vaccino creato o un messaggio di errore.
        */

    async createVaccino(req: Request, res: Response): Promise<void> {
        try {
            const vaccino = await vaccinoService.createVaccino(req.body);
            res.status(201).json({ message: AppSuccessMessage.VACCINO_CREATED, vaccino });
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    /*
        * Recupera un vaccino specifico in base al suo ID.
        * @param req - La richiesta HTTP contenente l'ID del vaccino come parametro della richiesta.            
        * @param res - La risposta HTTP che conterrà il vaccino o un messaggio di errore.
        */

    async getVaccinoById(req: Request, res: Response): Promise<void> {
        try {
            const vaccino = req.targetVaccino!;
            res.status(200).json(vaccino);
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    /*  
        * Recupera tutti i vaccini disponibili.
        * @param req - La richiesta HTTP, che può contenere parametri di query per filtrare o ordinare i vaccini.
        * @param res - La risposta HTTP che conterrà l'elenco dei vaccini o un messaggio di errore.
        */

    async getStatistiche(req: Request, res: Response): Promise<void> {
        try {
            const statistiche = await vaccinoService.getStatistiche();
            res.status(200).json(statistiche);
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    /*
        * Recupera le statistiche di copertura vaccinale.
        * @param req - La richiesta HTTP, che può contenere parametri di query per filtrare o ordinare le statistiche.
        * @param res - La risposta HTTP che conterrà le statistiche di copertura o un messaggio di errore.
        */

    async getStatisticheCopertura(req: Request, res: Response): Promise<void> {
        try {
            const statistiche = await vaccinoService.getStatisticheCopertura();
            res.status(200).json(statistiche);
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    /*
        * Recupera le statistiche di copertura vaccinale per un vaccino specifico.
        * @param req - La richiesta HTTP contenente l'ID del vaccino come parametro della richiesta.
        * @param res - La risposta HTTP che conterrà le statistiche di copertura per il vaccino specifico o un messaggio di errore.
        */

    async searchVaccini(req: Request, res: Response): Promise<void> {
            const vaccini = await vaccinoService.searchVaccini(req.query as VaccinoSearchFilters);
            res.status(200).json(vaccini);
    }

    /*
        * Recupera tutti i vaccini disponibili.
        * @param req - La richiesta HTTP.
        * @param res - La risposta HTTP che conterrà l'elenco dei vaccini o un messaggio di errore.
        */

    async getAllVaccini(req: Request, res: Response): Promise<void> {
        try {
            const vaccini = await vaccinoService.getAllVaccini();
            res.status(200).json(vaccini);
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }


    /*
        * Aggiorna un vaccino specifico in base al suo ID.
        * @param req - La richiesta HTTP contenente l'ID del vaccino e i dati aggiornati nel corpo della richiesta.
        * @param res - La risposta HTTP che conterrà il vaccino aggiornato o un messaggio di errore.
        */

    async updateVaccino(req: Request, res: Response): Promise<void> {
        try {
            const targetId = Number(req.params.id);
            const vaccino = await vaccinoService.updateVaccino(targetId, req.body);
            res.status(200).json({ message: AppSuccessMessage.VACCINO_UPDATED, vaccino });
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }


    /*
        * Elimina un vaccino specifico in base al suo ID.
        * @param req - La richiesta HTTP contenente l'ID del vaccino come parametro della richiesta.
        * @param res - La risposta HTTP che conterrà un messaggio di successo o un messaggio di errore.
        */

    async deleteVaccino(req: Request, res: Response): Promise<void> {
        try {
            const targetId = Number(req.params.id);
            await vaccinoService.deleteVaccino(targetId);
            res.status(200).json({ message: AppSuccessMessage.VACCINO_DELETED });
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }
}

export const vaccinoController = new VaccinoController();
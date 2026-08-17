import { Request, Response } from "express";
import { userService } from "../service/UserService";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";
import { AppSuccessMessage } from "../enum/AppSuccessMessage";
import { sanitizeUser, sanitizeUsers } from "../utils/UserSerializer";

export class UserController {

    /*
        * Crea un nuovo utente.
        * @param req - La richiesta HTTP contenente i dati dell'utente.
        * @param res - La risposta HTTP che conterrà l'utente creato o un messaggio di errore.
        */

    async createUser(req: Request, res: Response): Promise<void> {
        try {
            const user = await userService.createUser(req.body);
            res.status(201).json({ message: AppSuccessMessage.USER_CREATED, user: sanitizeUser(user) });
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    /*
        * Recupera un utente specifico in base al suo CF.
        * @param req - La richiesta HTTP contenente il CF dell'utente.
        * @param res - La risposta HTTP che conterrà l'utente o un messaggio di errore.
        */
    async getUserById(req: Request, res: Response): Promise<void> {
        try {
            const user = req.targetUser!;
            res.status(200).json(sanitizeUser(user));
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    /*
        * Recupera tutti gli utenti.
        * @param req - La richiesta HTTP.
        * @param res - La risposta HTTP che conterrà l'elenco degli utenti o un messaggio di errore.
        */
    
    async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            const users = await userService.getAllUsers();
            res.status(200).json(sanitizeUsers(users));
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    /*
        * Recupera gli utenti con copertura vaccinale scaduta in base ai parametri di query.
        * @param req - La richiesta HTTP contenente i parametri di query (vaccino, giorniMin, giorniMax).
        * @param res - La risposta HTTP che conterrà l'elenco degli utenti o un messaggio di errore.
        */

    async getUsersWithExpiredCoverage(req: Request, res: Response): Promise<void> {
        try {
            const utenti = await userService.getUsersWithExpiredCoverage({
                vaccino: req.query.vaccino as string,
                giorniMin: req.query.giorniMin ? Number(req.query.giorniMin) : undefined,
                giorniMax: req.query.giorniMax ? Number(req.query.giorniMax) : undefined,
            });

            res.status(200).json(sanitizeUsers(utenti));
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    /*
        * Aggiorna un utente specifico in base al suo CF.
        * @param req - La richiesta HTTP contenente il CF dell'utente e i dati aggiornati si trovano nel corpo della richiesta.
        * @param res - La risposta HTTP che conterrà l'utente aggiornato o un messaggio di errore.
        */

    async updateUser(req: Request, res: Response): Promise<void> {
        try {
            // ":cf" non è un parametro ripetuto/wildcard, quindi è sempre una singola stringa
            const cf = req.params.cf as string;
            const user = await userService.updateUser(cf, req.body);
            
            if (!user) {
                res.status(404).json({ error: AppErrorsMessage.SERVER_ERROR });
                return;
            }

            res.status(200).json({ message: AppSuccessMessage.USER_UPDATED, user: sanitizeUser(user) });
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }

    /*
        * Elimina un utente specifico in base al suo CF.
        * @param req - La richiesta HTTP contenente il CF dell'utente.
        * @param res - La risposta HTTP che conterrà un messaggio di successo o un messaggio di errore.
        */

    async deleteUser(req: Request, res: Response): Promise<void> {
        try {
            // ":cf" non è un parametro ripetuto/wildcard, quindi è sempre una singola stringa
            const cf = req.params.cf as string;
            await userService.deleteUser(cf);
            res.status(200).json({ message: AppSuccessMessage.USER_DELETED });
        } catch {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }
}

export const userController = new UserController();
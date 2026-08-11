import { Request, Response, NextFunction } from "express";
import { userDao } from "../dao/UserDao";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";

// Middleware per verificare se un utente esiste nel database in base al codice fiscale fornito nella richiesta sia come parametro di query che come parametro di body. Se l'utente esiste, viene aggiunto all'oggetto della richiesta per essere utilizzato nei middleware successivi o nei controller.

export async function userExist(req: Request, res: Response, next: NextFunction): Promise<void> {
    const cf = req.body?.cf || req.params?.cf || req.query?.cf as string;

    if (!cf) {
        res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
        return;
    }

    const user = await userDao.findById(cf);
    if (!user) {
        res.status(404).json({ error: AppErrorsMessage.USER_NOT_FOUND });
        return;
    }

    req.targetUser = user;
    next();
}
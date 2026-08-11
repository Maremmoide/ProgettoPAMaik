// middleware/tokenMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { userDao } from "../dao/UserDao";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";


// Funzione per check dei token

export async function checkTokenAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = req.user!;

    const ok = await userDao.decrementTokenIfAvailable(user.cf);
    if (!ok) {
        res.status(401).json({ error: AppErrorsMessage.NO_TOKENS_LEFT });
        return;
    }
    next();
}


// Funzione per check dei numeri negativi e corretta formattazzione.
export async function correctAmount(req: Request, res: Response, next: NextFunction): Promise<void> {
    const rawAmount = req.body?.amount;

    // mancante
    if (rawAmount === undefined || rawAmount === null) {
        res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
        return;
    }

    // converte in numero (gestisce sia 10 che "10", ma non "abc")
    const amount = Number(rawAmount);

    // non è un numero valido (es. "abc", "12abc", "")
    if (isNaN(amount)) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATA });
        return;
    }

    // negativo
    if (amount < 0) {
        res.status(400).json({ error: AppErrorsMessage.NEGATIVE_NUMBER_NOT_AVAILABLE });
        return;
    }

    // salva il valore convertito sul body per il controller
    req.body.amount = amount;
    next();
}
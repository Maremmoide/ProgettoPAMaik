import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { publicKey } from "../config/keys";
import { AppJwtPayload } from "../types/jwt-payload";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";


/*
    * Middleware di autenticazione: verifica che la richiesta contenga un Bearer JWT valido,
    * firmato con la chiave privata RS256 corrispondente a publicKey.
    * Se valido, allega il payload decodificato a req.user e passa al middleware successivo.
    * @param req - La richiesta HTTP, deve contenere l'header Authorization: Bearer <token>.
    * @param res - La risposta HTTP, usata per restituire 401 in caso di token mancante/scaduto/non valido.
    * @param next - Callback per passare al middleware successivo.
    */

export function authenticate(req: Request, res: Response, next: NextFunction): void {

    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ error: AppErrorsMessage.MISSING_TOKEN });
        return;
    }

    const token = header.split(" ")[1];

    try {
        const payload = jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as AppJwtPayload;
        req.user = payload;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: AppErrorsMessage.TOKEN_EXPIRED });
        } else {
            res.status(401).json({ error: AppErrorsMessage.INVALID_TOKEN });
        }
    }
}

/*
    * Middleware factory per l'autorizzazione basata sui ruoli.
    * @param roles - Uno o più ruoli ammessi per la rotta; basta che l'utente ne possieda uno.
    * @returns Un middleware Express che restituisce 403 se nessuno dei ruoli richiesti è posseduto.
    */

export function requireRole(...roles: ("user" | "operator" | "admin" | "both")[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user;

        if (!user || !roles.some(role => user.roles.includes(role))) {
            res.status(403).json({ error: AppErrorsMessage.PERMISSION_DENIED });
            return;
        }
        next();
    };
}
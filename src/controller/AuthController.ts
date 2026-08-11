import { Request, Response } from "express";
import { authService } from "../service/AuthService";
import { AppErrorsName } from "../enum/AppErrorsName";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";

export class AuthController {

/*Metodo per gestire il login di un utente.
* @param req - Oggetto Request di Express contenente le informazioni della richiesta HTTP, email e password dell'utente.
* @param res - Oggetto Response di Express utilizzato per inviare la risposta HTTP, in caso di successo invia un token JWT, in caso di errore invia un messaggio di errore appropriato.
* @returns Una Promise che risolve void. In caso di successo, invia un token JWT al client. In caso di errore, invia un messaggio di errore appropriato.
*/
    async login(req: Request, res: Response): Promise<void> {
    try {
        if (!req.body?.email || !req.body?.password) {
            res.status(400).json({ error: AppErrorsMessage.INVALID_INPUT });
            return;
        }
        const { email, password } = req.body;
        const token = await authService.login(email, password);
        res.status(200).json({ token });
    } catch (error) {
        console.error("Errore durante il login:", error);
        if (error instanceof Error && error.name === AppErrorsName.INVALID_CREDENTIALS) {
            res.status(401).json({ error: AppErrorsMessage.INVALID_CREDENTIALS });
        } else {
            res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
        }
    }
}
}

export const authController = new AuthController();
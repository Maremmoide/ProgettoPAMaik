import { Request, Response } from "express";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";
import { AppSuccessMessage } from "../enum/AppSuccessMessage";
import {userDao} from "../dao/UserDao"
import { sanitizeUser } from "../utils/UserSerializer";

export class AdminController{

// Metodo per aggiungere token ad un certo User (sia operator che user)

 async increaseUserTokens(req: Request, res: Response): Promise<void> {
    try {
        const { amount } = req.body;
        const targetUser = req.targetUser!;

        const user = await userDao.increaseTokens(targetUser.cf, amount);

        if (!user) {
            res.status(404).json({ error: AppErrorsMessage.SERVER_ERROR });
            return;
        }

        res.status(200).json({ message: AppSuccessMessage.TOKENS_UPDATED, user: sanitizeUser(user) });
    } catch {
        res.status(500).json({ error: AppErrorsMessage.SERVER_ERROR });
    }
 }
}

export const adminController = new AdminController();
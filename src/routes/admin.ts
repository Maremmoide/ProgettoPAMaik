import { Router } from "express";
import { adminController } from "../controller/AdminController";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { vaccinazioneController } from "../controller/VaccinazioneController";
import { userExist } from "../middleware/redis.middleware";
import { correctAmount } from "../middleware/token.middleware";

const router = Router();



// Rotta per aggiungere token ad un User o Operator
router.patch('/admin/addToken/:cf', authenticate, requireRole("admin"), userExist, correctAmount, adminController.increaseUserTokens)


// Rotta token redis admin/code mettere nel body l'utente che si vuole vedere senza usare il JWT
router.post('/admin/code', authenticate, requireRole("admin"), userExist, vaccinazioneController.generateCoperturaCode)



export default router;

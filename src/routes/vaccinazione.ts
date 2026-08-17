import { Router } from "express";
import { vaccinazioneController } from "../controller/VaccinazioneController";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { checkTokenAvailability } from "../middleware/token.middleware";
import { checkCoverageExpired, checkFiltriVaccinazione, checkLottoValid, checkUserExists, checkVaccineNotExpired } from "../middleware/vaccinazione.middleware";
import { checkNomeVaccinoExists } from "../middleware/vaccino.middleware";
import { userExist } from "../middleware/redis.middleware";

const router = Router();

// Creare vaccinazione con tutti i limiti richiesti dalla consegna del progetto
router.post(
    "/",
    authenticate,
    requireRole("operator", "admin"),
    checkUserExists,
    checkLottoValid,
    checkVaccineNotExpired,
    checkCoverageExpired,
    checkTokenAvailability,
    vaccinazioneController.createVaccinazione
);

// Ottenere tutte le vaccinazioni
router.get('/', authenticate, requireRole("admin"), vaccinazioneController.getAllVaccinazioni);

// PDF storico vaccinazioni [A,U] — admin/operator specifica cf in query, user usa il proprio dal JWT
// NB: rotte letterali (pdf, filtrareuseradmin, copertura*) DEVONO stare prima di "/:id",
// altrimenti verrebbero intercettate come se "pdf"/"filtrareuseradmin"/"copertura" fossero un id.
router.get("/pdf", authenticate, requireRole("admin", "user"), vaccinazioneController.pdfVaccinazione);

// vaccinazioni filtrate [A,U] /api/vaccinazioni/filtrareuseradmin?nomeVaccino=pfizer&dataMin=2024-01-01&dataMax=2024-12-31
router.get("/filtrareuseradmin", authenticate, requireRole("admin", "user"), checkNomeVaccinoExists, checkFiltriVaccinazione, vaccinazioneController.getFilteredVaccinazioni);

// Report copertura PDF [A,U]
router.get("/copertura/pdf", authenticate, requireRole("admin", "user"), userExist, vaccinazioneController.getCoperturaPdf);

// Bypass JWT tramite codice OTP Redis [nessuna autenticazione, il codice sostituisce il JWT]
router.get("/copertura/code", vaccinazioneController.getCoperturaByCode);

// Report copertura JSON [A,U] — admin vede tutti (filtra con cf), user solo le proprie ?cf=RSSMRA80A01H501U&order=desc
router.get("/copertura", authenticate, requireRole("admin", "user"), userExist, vaccinazioneController.getCoperturaReport);

// Ottenere una singola vaccinazione (deve restare dopo le rotte letterali sopra)
router.get('/:id', authenticate, requireRole("operator", "admin"), vaccinazioneController.getVaccinazioneById);

// Update vaccinazione da inserire nel body cf e lotto id altrimenti non si può aggiornare la vaccinazione
router.patch('/:id', authenticate, requireRole("operator", "admin"), userExist, checkLottoValid, checkTokenAvailability, vaccinazioneController.updateVaccinazione);

// cancellazione vaccinazione
router.delete('/:id', authenticate, requireRole("admin", "operator"), vaccinazioneController.deleteVaccinazione);

export default router;

import { Request, Response, NextFunction } from "express";
import { userDao } from "../dao/UserDao";
import { lottoVaccinoDao } from "../dao/LottoVaccinoDao";
import { vaccinoDao } from "../dao/VaccinoDao";
import { vaccinazioneDao } from "../dao/VaccinazioneDao";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";

// 1. Utente esistente
export async function checkUserExists(req: Request, res: Response, next: NextFunction): Promise<void> {
    const cf = req.body?.cf;

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

// 2. Lotto valido
export async function checkLottoValid(req: Request, res: Response, next: NextFunction): Promise<void> {
    const lotto_id  = req.body?.lotto_id;

    if (!lotto_id) {
        res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
        return;
    }

    const lotto = await lottoVaccinoDao.findById(lotto_id);
    if (!lotto) {
        res.status(404).json({ error: AppErrorsMessage.LOTTO_NOT_FOUND });
        return;
    }

    req.lotto = lotto;
    next();
}

// 3. Vaccino (lotto) non scaduto rispetto alla data di vaccinazione
export async function checkVaccineNotExpired(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { data_vaccinazione } = req.body;
    const lotto = req.lotto!;

    if (!data_vaccinazione) {
        res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
        return;
    }

    const dataVacc = new Date(data_vaccinazione);

    if (isNaN(dataVacc.getTime())) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATE });
        return;
    }

    if (dataVacc > new Date(lotto.dataScadenza)) {
        res.status(409).json({ error: AppErrorsMessage.VACCINE_EXPIRED });
        return;
    }

    req.dataVaccinazione = dataVacc;
    next();
}

// 4. Copertura non ancora esaurita (vaccinazione anticipata)
export async function checkCoverageExpired(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { cf } = req.body;
    const lotto = req.lotto!;
    const dataVacc = req.dataVaccinazione!;

    const vaccino = await vaccinoDao.findById(lotto.vaccinoId);
    if (!vaccino) {
        res.status(404).json({ error: AppErrorsMessage.VACCINO_NOT_FOUND });
        return;
    }

    const lastVaccinazione = await vaccinazioneDao.findLastByUserAndVaccino(cf, lotto.vaccinoId);

    if (lastVaccinazione) {
        const coverageEnd = new Date(lastVaccinazione.dataVaccinazione);
        coverageEnd.setDate(coverageEnd.getDate() + vaccino.durataCopertura);

        if (dataVacc < coverageEnd) {
            res.status(409).json({ error: AppErrorsMessage.COVERAGE_NOT_EXPIRED });
            return;
        }
    }

    req.vaccino = vaccino;
    next();
}

// middleware/vaccinazione.middleware.ts — aggiunta
export async function checkFiltriVaccinazione(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { dataGt, dataLt, dataMin, dataMax } = req.query;

    // valida dataGt se presente
    if (dataGt && isNaN(new Date(dataGt as string).getTime())) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATE });
        return;
    }

    // valida dataLt se presente
    if (dataLt && isNaN(new Date(dataLt as string).getTime())) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATE });
        return;
    }

    // valida dataMin se presente
    if (dataMin && isNaN(new Date(dataMin as string).getTime())) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATE });
        return;
    }

    // valida dataMax se presente
    if (dataMax && isNaN(new Date(dataMax as string).getTime())) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATE });
        return;
    }

    // dataMin e dataMax devono essere usati insieme
    if ((dataMin && !dataMax) || (!dataMin && dataMax)) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATA });
        return;
    }

    // se entrambi presenti, dataMin deve essere prima di dataMax
    if (dataMin && dataMax) {
        if (new Date(dataMin as string) >= new Date(dataMax as string)) {
            res.status(400).json({ error: AppErrorsMessage.INVALID_DATE });
            return;
        }
    }

    // dataGt e dataLt non possono essere usati insieme al range dataMin/dataMax
    if ((dataGt || dataLt) && (dataMin || dataMax)) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATA });
        return;
    }

    // dataGt e dataLt non possono essere usati insieme tra loro
    if (dataGt && dataLt) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATA });
        return;
    }

    next();
}
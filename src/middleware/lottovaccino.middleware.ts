import { Request, Response, NextFunction } from "express";
import { vaccinoDao } from "../dao/VaccinoDao";
import { lottoVaccinoDao } from "../dao/LottoVaccinoDao";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";

// 1. Verifica che il vaccino esista
export async function checkVaccinoExists(req: Request, res: Response, next: NextFunction): Promise<void> {
    const vaccinoId = Number(req.params.vaccinoId);

    if (isNaN(vaccinoId)) {
        res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
        return;
    }

    const vaccino = await vaccinoDao.findById(vaccinoId);
    if (!vaccino) {
        res.status(404).json({ error: AppErrorsMessage.VACCINO_NOT_FOUND });
        return;
    }

    req.vaccino = vaccino;
    next();
}

// 2. Verifica che il codice lotto non sia già usato
export async function checkCodiceLottoUnique(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { codiceLotto } = req.body;

    if (!codiceLotto) {
        res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
        return;
    }

    const existing = await lottoVaccinoDao.findByCodiceLotto(codiceLotto);
    if (existing) {
        res.status(409).json({ error: AppErrorsMessage.LOTTO_ALREADY_EXISTS });
        return;
    }




    
    next();
}
// 3. Verifica che la quantità disponibile non sia negativa
export async function checkQuantitaPositiva(req: Request, res: Response, next: NextFunction): Promise<void> {
    const rawQuantita = req.body?.quantitaDisponibile;

    if (rawQuantita === undefined || rawQuantita === null) {
        res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
        return;
    }

    const quantita = Number(rawQuantita);

    if (isNaN(quantita)) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATA });
        return;
    }

    if (quantita < 0) {
        res.status(400).json({ error: AppErrorsMessage.NEGATIVE_NUMBER_NOT_AVAILABLE });
        return;
    }

    req.body.quantitaDisponibile = quantita;
    next();
}

// 4. Verifica coerenza date: dataConsegna deve essere prima di dataScadenza
export async function checkDateCoerenti(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { dataConsegna, dataScadenza } = req.body;

    if (!dataConsegna || !dataScadenza) {
        res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
        return;
    }

    const consegna = new Date(dataConsegna);
    const scadenza = new Date(dataScadenza);

    if (isNaN(consegna.getTime()) || isNaN(scadenza.getTime())) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATE });
        return;
    }

    if (consegna >= scadenza) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATE });
        return;
    }

    next();
}
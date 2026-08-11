import { Request, Response, NextFunction } from "express";
import { vaccinoDao } from "../dao/VaccinoDao";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";

// Verifica che il vaccino esista (per get singolo, update, delete)
export async function checkVaccinoExistsById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const targetId = Number(req.params.id);

    if (isNaN(targetId)) {
        res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
        return;
    }

    const vaccino = await vaccinoDao.findById(targetId);
    if (!vaccino) {
        res.status(404).json({ error: AppErrorsMessage.VACCINO_NOT_FOUND });
        return;
    }

    req.targetVaccino = vaccino;
    next();
}

// Verifica che il nome non sia già usato da un altro vaccino (per create e update)
export async function checkNomeVaccinoUnique(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { nome } = req.body;

    if (!nome) {
        // in update il nome può essere assente (campo opzionale), si passa oltre
        next();
        return;
    }

    if (typeof nome !== "string" || nome.trim() === "") {
        res.status(400).json({ error: AppErrorsMessage.INVALID_INPUT });
        return;
    }

    const existing = await vaccinoDao.findByNome(nome);
    const targetId = req.params.id ? Number(req.params.id) : undefined;

    if (existing && existing.id !== targetId) {
        res.status(409).json({ error: AppErrorsMessage.VACCINO_ALREADY_EXISTS });
        return;
    }

    next();
}

// Per query string, verifica che il nome del vaccino esista (per filtraggio)
export async function checkNomeVaccinoExists(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { nomeVaccino } = req.query;

    // se non è presente, il filtro è opzionale → si passa oltre
    if (!nomeVaccino) {
        next();
        return;
    }

    const vaccino = await vaccinoDao.findByNome(nomeVaccino as string);
    if (!vaccino) {
        res.status(404).json({ error: AppErrorsMessage.VACCINO_NOT_FOUND });
        return;
    }

    // salva il vaccino trovato per evitare query duplicate nel controller
    req.vaccinoFiltro = vaccino;
    next();
}

// aggiunta per filtraggio
export async function checkDurataCopertura(req: Request, res: Response, next: NextFunction): Promise<void> {
    const rawDurata = req.body?.durataCopertura;

    if (rawDurata === undefined || rawDurata === null) {
        res.status(400).json({ error: AppErrorsMessage.MISSING_DATA });
        return;
    }

    const durata = Number(rawDurata);

    if (isNaN(durata)) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_DATA });
        return;
    }

    if (durata <= 0) {
        res.status(400).json({ error: AppErrorsMessage.NEGATIVE_NUMBER_NOT_AVAILABLE });
        return;
    }

    req.body.durataCopertura = durata;
    next();
}


export async function checkVaccinoQueryExistsById(req: Request, res: Response, next: NextFunction): Promise<void> {
const { nomeVaccino } = req.query;

    // se non è presente, il filtro è opzionale → si passa oltre
    if (!nomeVaccino) {
        next();
        return;
    }

    const nomi = String(nomeVaccino)
        .split(",")
        .map((nome) => nome.trim())
        .filter(Boolean);

    if (nomi.length === 0) {
        next();
        return;
    }

    const risultati = [] as Array<{ id: number; nome: string }>;

    for (const nome of nomi) {
        const vaccino = await vaccinoDao.findByNome(nome);
        if (!vaccino) {
            res.status(404).json({ error: AppErrorsMessage.VACCINO_NOT_FOUND });
            return;
        }

        risultati.push(vaccino);
    }

    // salva i vaccini trovati per evitare query duplicate nel controller
    req.vaccinoFiltro = risultati;
    next();
}


export async function checkScadenza(req: Request, res: Response, next: NextFunction): Promise<void> {

    const scadenzaMaggioreDi = req.query?.scadenzaMaggioreDi as string | undefined;
    const scadenzaMinoreDi = req.query?.scadenzaMinoreDi as string | undefined;

    if (scadenzaMaggioreDi) {
        const dataMaggiore = new Date(scadenzaMaggioreDi);
        if (isNaN(dataMaggiore.getTime())) {
            res.status(400).json({ error: AppErrorsMessage.INVALID_DATE });
            return;
        }
    }

    if (scadenzaMinoreDi) {
        const dataMinore = new Date(scadenzaMinoreDi);
        if (isNaN(dataMinore.getTime())) {
            res.status(400).json({ error: AppErrorsMessage.INVALID_DATE });
            return;
        }
    }

    next();
}


export async function checkDisponibilita(req: Request, res: Response, next: NextFunction): Promise<void> {
    const disponibilitaMin = req.query?.disponibilitaMin as string | undefined;
    const disponibilitaMax = req.query?.disponibilitaMax as string | undefined;

    if (disponibilitaMin) {
        const min = Number(disponibilitaMin);   
        if (isNaN(min)) {
            res.status(400).json({ error: AppErrorsMessage.INVALID_NUMBER });
            return;
        }

        if (min < 0) {
            res.status(400).json({ error: AppErrorsMessage.NEGATIVE_NUMBER_NOT_AVAILABLE });
            return;
        }

    }

    if (disponibilitaMax) {
        const max = Number(disponibilitaMax);
        if (isNaN(max)) {
            res.status(400).json({ error: AppErrorsMessage.INVALID_NUMBER });
            return;
        }   

        if (max < 0) {
            res.status(400).json({ error: AppErrorsMessage.NEGATIVE_NUMBER_NOT_AVAILABLE });
            return;
        }
    }

    next();
}


export async function checkCoerenzaDisponibilita(req: Request, res: Response, next: NextFunction): Promise<void> {
    const disponibilitaMin = req.query?.disponibilitaMin as string | undefined;
    const disponibilitaMax = req.query?.disponibilitaMax as string | undefined;
    const date_disponibilitaMin = disponibilitaMin ? Number(disponibilitaMin) : undefined;
    const date_disponibilitaMax = disponibilitaMax ? Number(disponibilitaMax) : undefined;

    if (date_disponibilitaMin !== undefined && date_disponibilitaMax !== undefined) {
        if (date_disponibilitaMin > date_disponibilitaMax) {
            res.status(400).json({ error: AppErrorsMessage.INVALID_DATA });
            return;
        }
    }
    next();
}

export async function checkCoerenzaScadenza(req: Request, res: Response, next: NextFunction): Promise<void> {
    const scadenzaMaggioreDi = req.query?.scadenzaMaggioreDi as string | undefined;
    const scadenzaMinoreDi = req.query?.scadenzaMinoreDi as string | undefined;
    const date_scadenzaMaggioreDi = scadenzaMaggioreDi ? new Date(scadenzaMaggioreDi) : undefined;
    const date_scadenzaMinoreDi = scadenzaMinoreDi ? new Date(scadenzaMinoreDi) : undefined;

    if (date_scadenzaMaggioreDi !== undefined && date_scadenzaMinoreDi !== undefined) {
        if (date_scadenzaMaggioreDi > date_scadenzaMinoreDi) {
            res.status(400).json({ error: AppErrorsMessage.INVALID_DATA });
            return;
        }
    }
    next();
}


export async function checkCopertura(req: Request, res: Response, next: NextFunction): Promise<void> {
    const durataCopertura = req.body?.durataCopertura;

    if (durataCopertura === undefined || durataCopertura === null) {
        next();
        return;
    }

    const durata = Number(durataCopertura);
    if (isNaN(durata)) {
        res.status(400).json({ error: AppErrorsMessage.INVALID_NUMBER });
        return;
    }

    if (durata < 0) {
        res.status(400).json({ error: AppErrorsMessage.NEGATIVE_NUMBER_NOT_AVAILABLE });
        return;
    }

    next();
}
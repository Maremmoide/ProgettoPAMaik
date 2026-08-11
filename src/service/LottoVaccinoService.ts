import { lottoVaccinoDao } from "../dao/LottoVaccinoDao";

/*
    * Servizio per la gestione dei lotti di vaccino.
    * Fornisce metodi per creare un nuovo lotto, recuperare lotti per vaccino e ottenere un lotto specifico per ID.
    * Utilizza il LottoVaccinoDao per interagire con il database.
    */

/*
    * Corpo della richiesta di creazione di un lotto. Le date arrivano come stringa
    * dal JSON del body (req.body), per questo sono tipizzate string | Date.
    */
export interface LottoVaccinoCreationPayload {
    codiceLotto: string;
    quantitaDisponibile: number;
    dataConsegna: string | Date;
    dataScadenza: string | Date;
}

export class LottoVaccinoService {

    async createLotto(vaccinoId: number, data: LottoVaccinoCreationPayload) {
        // vaccino esistente e unicità codiceLotto già verificati dai middleware
        // checkVaccinoExists e checkCodiceLottoUnique sulla rotta
        return lottoVaccinoDao.create({
            vaccinoId,
            codiceLotto: data.codiceLotto,
            quantitaDisponibile: data.quantitaDisponibile,
            dataConsegna: new Date(data.dataConsegna),
            dataScadenza: new Date(data.dataScadenza)
        });
    }

    async getLottiByVaccino(vaccinoId: number, min?: number, max?: number) {
        return lottoVaccinoDao.findByVaccinoId(vaccinoId, min, max);
    }

    async getLottoById(id: number) {
        // se serve in futuro, l'esistenza andrebbe verificata da un middleware analogo
        return lottoVaccinoDao.findById(id);
    }
}

export const lottoVaccinoService = new LottoVaccinoService();
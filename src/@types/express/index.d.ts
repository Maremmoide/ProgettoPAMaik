import type { User } from "../../model/User";
import type { Vaccino } from "../../model/Vaccino";
import type { LottoVaccino } from "../../model/LottoVaccino";
import type { AppJwtPayload } from "../../types/jwt-payload";

/*
    * Estende l'oggetto Request di Express con le proprietà custom che i middleware
    * dell'applicazione allegano alla richiesta prima che questa raggiunga il controller.
    * Centralizza qui i vari (req as any).campo che erano sparsi nel codice, così ogni
    * proprietà è tipizzata una sola volta invece di essere ri-castata ad ogni utilizzo.
    */

declare global {
    namespace Express {
        interface Request {
            /** Payload del JWT decodificato, allegato da authenticate() in auth.middleware.ts. */
            user?: AppJwtPayload;

            /**
             * Utente target risolto da un middleware di validazione prima del controller
             * (checkUserExists in vaccinazione.middleware.ts, userExist in redis.middleware.ts).
             */
            targetUser?: User;

            /** Vaccino risolto da checkVaccinoExistsById in vaccino.middleware.ts. */
            targetVaccino?: Vaccino;

            /**
             * Vaccino risolto da checkCoverageExpired in vaccinazione.middleware.ts,
             * oppure da checkVaccinoExists in lottovaccino.middleware.ts.
             */
            vaccino?: Vaccino;

            /** Lotto risolto da checkLottoValid in vaccinazione.middleware.ts. */
            lotto?: LottoVaccino;

            /** Data di vaccinazione validata da checkVaccineNotExpired in vaccinazione.middleware.ts. */
            dataVaccinazione?: Date;

            /**
             * Risultato del filtro per nome vaccino in vaccino.middleware.ts: un singolo vaccino
             * da checkNomeVaccinoExists, oppure un array da checkVaccinoQueryExistsById quando la
             * query contiene più nomi separati da virgola.
             */
            vaccinoFiltro?: Vaccino | Array<{ id: number; nome: string }>;
        }
    }
}

// Richiesto perché TypeScript tratti questo file come un modulo (necessario per "declare global"),
// senza che esporti realmente nulla a runtime.
export {};

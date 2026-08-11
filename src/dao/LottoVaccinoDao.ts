import { IDao } from "./IDao";
import { Op, literal, Transaction, WhereOptions, WhereOperators } from "sequelize";
import { LottoVaccino, LottoVaccinoAttributes, LottoVaccinoCreationAttributes } from "../model/LottoVaccino";


/*
    * LottoVaccinoDao è una classe che implementa l'interfaccia IDao per gestire le operazioni CRUD sul modello LottoVaccino.
    * Fornisce metodi per creare, leggere, aggiornare, eliminare e trovare lotti di vaccino nel database.
    * Inoltre, include metodi specifici per trovare lotti in base all'ID del vaccino o al codice del lotto.
    */

export class LottoVaccinoDao implements IDao<LottoVaccino> {


    async create(item: LottoVaccinoCreationAttributes): Promise<LottoVaccino> {
        return await LottoVaccino.create(item);
    }

    async read(item: LottoVaccinoAttributes): Promise<LottoVaccino | null> {
        return await LottoVaccino.findByPk(item.id);
    }

    async update(item: Partial<LottoVaccinoAttributes>, updatedItem: Partial<LottoVaccinoAttributes>): Promise<LottoVaccino | null> {
        const lotto = await LottoVaccino.findByPk(item.id);
        if (!lotto) return null;

        await lotto.update(updatedItem);
        return lotto;
    }

    async delete(id: number): Promise<boolean> {
        const lotto = await LottoVaccino.findByPk(id);
        if (!lotto) return false;

        await lotto.destroy();
        return true;
    }

    async findAll(): Promise<LottoVaccino[]> {
        return await LottoVaccino.findAll();
    }

    async findById(id: number) {
        return await LottoVaccino.findByPk(id);
    }


    /*
        * Trova tutti i lotti di vaccino associati a un determinato ID di vaccino.
        * @param vaccinoId - L'ID del vaccino per cui cercare i lotti.
        * @param min - (Opzionale) La quantità minima disponibile per filtrare i lotti.
        * @param max - (Opzionale) La quantità massima disponibile per filtrare i lotti.
        * @returns Una promessa che risolve un array di lotti di vaccino corrispondenti ai criteri di ricerca.
        */

    async findByVaccinoId(
        vaccinoId: number,
        min?: number,
        max?: number
    ): Promise<LottoVaccino[]> {

        let quantitaDisponibile: WhereOperators<number> | undefined;

        if (min !== undefined && max !== undefined) {
            quantitaDisponibile = { [Op.between]: [min, max] };
        }
        else if (min !== undefined) {
            quantitaDisponibile = { [Op.gte]: min };
        }
        else if (max !== undefined) {
            quantitaDisponibile = { [Op.lte]: max };
        }

        const where: WhereOptions<LottoVaccinoAttributes> = {
            vaccinoId,
            ...(quantitaDisponibile && { quantitaDisponibile }),
        };

        return LottoVaccino.findAll({ where });
    }


    /*
        * Trova un lotto di vaccino in base al codice del lotto.
        * @param codiceLotto - Il codice del lotto da cercare.
        * @returns Una promessa che risolve il lotto di vaccino corrispondente al codice fornito, o null se non trovato.
    */

    async findByCodiceLotto(codiceLotto: string): Promise<LottoVaccino | null> {
        return await LottoVaccino.findOne({ where: { codiceLotto } });
    }

    /*
        * Decrementa di 1 la quantità disponibile di un lotto, solo se è maggiore di 0.
        * L'operazione è atomica a livello di database (UPDATE ... WHERE quantita_disponibile > 0),
        * quindi resta corretta anche con più richieste concorrenti sullo stesso lotto.
        * @param id - L'ID del lotto da decrementare.
        * @param options - Opzioni Sequelize opzionali, ad es. { transaction } per farla rientrare
        *   nella stessa transazione della creazione della vaccinazione.
        * @returns true se il decremento è avvenuto, false se il lotto non esiste o è esaurito.
    */

    async decrementQuantitaIfAvailable(id: number, options?: { transaction?: Transaction }): Promise<boolean> {
        const [affectedRows] = await LottoVaccino.update(
            { quantitaDisponibile: literal('"quantita_disponibile" - 1') },
            { where: { id, quantitaDisponibile: { [Op.gt]: 0 } }, ...options }
        );
        return affectedRows > 0;
    }
}

export const lottoVaccinoDao = new LottoVaccinoDao();
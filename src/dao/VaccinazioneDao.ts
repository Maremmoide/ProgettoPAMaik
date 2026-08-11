import { IDao } from "./IDao";
import { Vaccinazione, VaccinazioneAttributes, VaccinazioneCreationAttributes } from "../model/Vaccinazione";
import { Op, WhereOptions, WhereOperators, Transaction } from "sequelize";
import { Vaccino, VaccinoAttributes } from "../model/Vaccino";
import { LottoVaccino } from "../model/LottoVaccino";


/*
    * Interfaccia per i filtri di ricerca delle vaccinazioni.
    * Contiene campi opzionali per filtrare le vaccinazioni in base al nome del vaccino e alle date.
*/


interface VaccinazioneFilters {
    nomeVaccino?: string;
    dataGt?: Date;
    dataLt?: Date;
    dataMin?: Date;
    dataMax?: Date;
}



/*
    * Classe DAO per la gestione delle operazioni CRUD sulle vaccinazioni.
    * Implementa l'interfaccia IDao per le vaccinazioni.
    * Fornisce metodi per creare, leggere, aggiornare e cancellare vaccinazioni, nonché per trovare vaccinazioni filtrate e dettagliate.
*/

export class VaccinazioneDao implements IDao<Vaccinazione> {

    async read(item: Vaccinazione): Promise<Vaccinazione | null> {
        return await Vaccinazione.findByPk(item.id);
    }

    async create(item: VaccinazioneCreationAttributes, options?: { transaction?: Transaction }): Promise<Vaccinazione> {
        return await Vaccinazione.create(item, options);
    }

    async findAll(): Promise<Vaccinazione[]> {
        return await Vaccinazione.findAll();
    }

    async update(
        item: Partial<VaccinazioneAttributes>,
        updatedVaccinazione: Partial<VaccinazioneAttributes>
    ): Promise<Vaccinazione | null> {
        const vaccinazione = await Vaccinazione.findByPk(item.id);
        if (!vaccinazione) {
            return null;
        }
        await vaccinazione.update(updatedVaccinazione);
        return vaccinazione;
    }

    async delete(id: number): Promise<boolean> {
        const vaccinazione = await Vaccinazione.findByPk(id);
        if (!vaccinazione) {
            return false;
        }
        await vaccinazione.destroy();
        return true;
    }

    async findById(id: number): Promise<Vaccinazione | null> {
            return Vaccinazione.findByPk(id);
        }
    
/*
    * Trova l'ultima vaccinazione di un utente per un determinato vaccino.
    * @param userCf - Il codice fiscale dell'utente.
    * @param vaccinoId - L'ID del vaccino.
    * @returns La vaccinazione più recente dell'utente per il vaccino specificato, o null se non esiste.
*/

    async findLastByUserAndVaccino(userCf: string, vaccinoId: number): Promise<Vaccinazione | null> {
        return Vaccinazione.findOne({
            where: { userCf, vaccinoId },
            order: [["dataVaccinazione", "DESC"]],
        });
    }   

    /*
        * Trova tutte le vaccinazioni di un utente specifico.
        * @param userCf - Il codice fiscale dell'utente.
        * @returns Un array di vaccinazioni dell'utente, ordinate per data di vaccinazione in ordine decrescente.
        * Aggiunto include per ottenere i dettagli del vaccino e del lotto associati a ciascuna vaccinazione.
    */

    async findAllByUserCf(userCf: string): Promise<Vaccinazione[]> {
    return Vaccinazione.findAll({
        where: { userCf },
        include: [
            { 
                model: Vaccino, 
                attributes: ["nome", "durataCopertura"] 
            },
            { 
                model: LottoVaccino, 
                attributes: ["codiceLotto"] 
            },
        ],
        order: [["dataVaccinazione", "DESC"]],
    });
}

    /*
        * Trova tutte le vaccinazioni di un utente specifico filtrate in base ai parametri forniti.
        * @param userCf - Il codice fiscale dell'utente.
        * @param filters - Un oggetto contenente i filtri opzionali per il nome del vaccino e le date.    
        * @returns Un array di vaccinazioni filtrate dell'utente, ordinate per data di vaccinazione in ordine decrescente.
        * Nota: Se entrambi i filtri dataMin e dataMax sono presenti, viene utilizzato il range tra le due date. Altrimenti, vengono applicati i filtri dataGt e dataLt se presenti.
        * I filtri sono opzionali e possono essere combinati per ottenere risultati più specifici.
    */

    async findFilteredByUserCf(userCf: string, filters: VaccinazioneFilters): Promise<Vaccinazione[]> {

    let dataVaccinazione: WhereOperators<Date> | undefined;

    // Filtro data: range ha priorità se entrambi min e max sono presenti
    if (filters.dataMin && filters.dataMax) {
        dataVaccinazione = { [Op.between]: [filters.dataMin, filters.dataMax] };
    } else if (filters.dataGt) {
        dataVaccinazione = { [Op.gt]: filters.dataGt };
    } else if (filters.dataLt) {
        dataVaccinazione = { [Op.lt]: filters.dataLt };
    }

    const where: WhereOptions<VaccinazioneAttributes> = {
        userCf,
        ...(dataVaccinazione && { dataVaccinazione }),
    };

    const nome: WhereOperators<string> | undefined = filters.nomeVaccino
        ? { [Op.iLike]: `%${filters.nomeVaccino}%` }
        : undefined;

    const vaccinoWhere: WhereOptions<VaccinoAttributes> = {
        ...(nome && { nome }),
    };

    return Vaccinazione.findAll({
        where,
        include: [
            { model: Vaccino, attributes: ["nome", "durataCopertura"], where: vaccinoWhere },
            { model: LottoVaccino, attributes: ["codiceLotto"] },
        ],
        order: [["dataVaccinazione", "DESC"]],
    });
    
}

/*
    * Trova tutte le vaccinazioni con dettagli aggiuntivi, inclusi i dati del vaccino e del lotto.
    * @param userCf - (Opzionale) Il codice fiscale dell'utente per filtrare le vaccinazioni. Se non fornito, vengono restituite tutte le vaccinazioni.
    * @returns Un array di vaccinazioni con dettagli aggiuntivi, inclusi i dati del vaccino e del lotto.
*/

async findAllWithDetails(userCf?: string): Promise<Vaccinazione[]> {
    const where = userCf ? { userCf } : {};

    return Vaccinazione.findAll({
        where,
        include: [
            { model: Vaccino, attributes: ["nome", "durataCopertura"] },
            { model: LottoVaccino, attributes: ["codiceLotto"] },
        ],
    });
}

}

export const vaccinazioneDao = new VaccinazioneDao();
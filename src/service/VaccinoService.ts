import { vaccinoDao, VaccinoSearchFilters } from "../dao/VaccinoDao";
import { userDao } from "../dao/UserDao";


/*    * Interfaccia per i dati di input necessari per creare un nuovo vaccino.
    * Contiene il nome del vaccino e la durata della copertura in giorni.
    */

interface CreateVaccinoInput {
    nome: string;
    durataCopertura: number;
}

/*    * Classe di servizio per la gestione dei vaccini.
    * Fornisce metodi per creare, leggere, aggiornare e cancellare vaccini, nonché per ottenere statistiche sui vaccini e sulla copertura vaccinale.
    */

export class VaccinoService {

    async createVaccino(data: CreateVaccinoInput) {
        // unicità del nome già verificata dal middleware checkNomeVaccinoUnique
        return vaccinoDao.create({
            nome: data.nome,
            durataCopertura: data.durataCopertura,
        });
    }

    async getVaccinoById(targetId: number) {
        // esistenza già verificata dal middleware checkVaccinoExistsById
        return vaccinoDao.findById(targetId);
    }

    async searchVaccini(filters: VaccinoSearchFilters) {
        return vaccinoDao.searchVaccini(filters);
    }

    async getAllVaccini() {
        return vaccinoDao.findAll();
    }

    async getStatistiche() {
        const vaccini = await vaccinoDao.getStatisticheVaccini();
        return { vaccini };
    }

    async getStatisticheCopertura() {
        return userDao.getCoverageStatistics();
    }

    async updateVaccino(targetId: number, updatedData: Partial<CreateVaccinoInput>) {
        // esistenza e unicità nome già verificate dai middleware
        return vaccinoDao.update({ id: targetId }, updatedData);
    }

    async deleteVaccino(targetId: number) {
        // esistenza già verificata dal middleware checkVaccinoExistsById
        await vaccinoDao.delete(targetId);
    }
}

export const vaccinoService = new VaccinoService();
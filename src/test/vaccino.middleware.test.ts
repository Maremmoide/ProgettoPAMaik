import { Request, Response } from "express";
import { checkVaccinoExistsById, checkVaccinoQueryExistsById } from "../middleware/vaccino.middleware";
import { vaccinoDao } from "../dao/VaccinoDao";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";

jest.mock("../dao/VaccinoDao", () => ({
    vaccinoDao: {
        findById: jest.fn(),
        findByNome: jest.fn()
    }
}));

describe("checkVaccinoExistsById", () => {

    test("chiama next se il vaccino esiste", async () => {
        (vaccinoDao.findById as jest.Mock).mockResolvedValue({
            id: 1,
            nome: "Pfizer"
        });

        const req = {
            params: { id: "1" }
        } as Partial<Request> as Request;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as Partial<Response> as Response;

        const next = jest.fn();

        await checkVaccinoExistsById(req, res, next);

        expect(next).toHaveBeenCalled();
    });

   test("se la query contiene più nomi li divide e chiama next se tutti esistono", async () => {
    (vaccinoDao.findByNome as jest.Mock)
        .mockResolvedValueOnce({ id: 1, nome: "Pfizer" })
        .mockResolvedValueOnce({ id: 2, nome: "Moderna" });

    const req = {
        query: { nomeVaccino: "Pfizer, Moderna" }
    } as Partial<Request> as Request;

    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    } as Partial<Response> as Response;

    const next = jest.fn();

    await checkVaccinoQueryExistsById(req, res, next);

    expect(vaccinoDao.findByNome).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    expect(req.vaccinoFiltro).toEqual([
        { id: 1, nome: "Pfizer" },
        { id: 2, nome: "Moderna" }
    ]);
});
})
import { Request, Response } from "express";
import { correctAmount } from "../middleware/token.middleware";
import { AppErrorsMessage } from "../enum/AppErrorsMessage";

describe("correctAmount", () => {

    test("restituisce 400 se amount manca", async () => {
        const req = {
            body: {}
        } as Partial<Request> as Request;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as Partial<Response> as Response;

        const next = jest.fn();

        await correctAmount(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: AppErrorsMessage.MISSING_DATA
        });
        expect(next).not.toHaveBeenCalled();
    });

    test("chiama next se amount è valido", async () => {
        const req = {
            body: {
                amount: 10
            }
        } as Partial<Request> as Request;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as Partial<Response> as Response;

        const next = jest.fn();

        await correctAmount(req, res, next);

        expect(next).toHaveBeenCalled();
    });

});
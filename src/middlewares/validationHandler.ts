import { validationResult } from 'express-validator';
import { Request, Response} from "express";

function validate(validations: any) {
    return async (req: Request, res: Response, next: any) => {
        for (let validation of validations) {
            const result = await validation.run(req);
            if (result.errors.length) break;
        }

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }
        // @ts-ignore
        res.sendStatus(400).json({ errors: errors.array() });
    };
}

module.exports = validate;

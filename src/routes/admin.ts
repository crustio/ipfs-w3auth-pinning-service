import * as express from "express";
export const router = express.Router();
router.get('/ping', (req, res) => {
    // @ts-ignore
    res.status(200).send('success');
});



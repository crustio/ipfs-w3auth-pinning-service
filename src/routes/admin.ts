import * as express from 'express';
export const router = express.Router();

router.get('/ping', (req, res) => {
  res.status(200).send('success');
});

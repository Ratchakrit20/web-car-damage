// Express route
import express, { Request, Response } from 'express';
import pool from '../models/db';

const router = express.Router();
router.get('/:citizen_id', async (req: Request, res: Response) => {
  const { citizen_id } = req.params;

  const result = await pool.query('SELECT * FROM insurance_policies WHERE citizen_id = $1', [citizen_id]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'ไม่พบข้อมูลกรมธรรม์' });
  }

  return res.json(result.rows);
});
export default router;

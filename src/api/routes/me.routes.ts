import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.get('/me', (req: Request, res: Response) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(200).json({ isAuthenticated: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return res.status(200).json({ isAuthenticated: true, user: decoded });
  } catch (error) {
    return res.status(401).json({ isAuthenticated: false });
  }
});

export default router;

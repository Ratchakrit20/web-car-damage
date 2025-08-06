import { Request, Response } from 'express';
import pool from '../models/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response) => {
  const { full_name, email, password, citizen_id, phone_number, address } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, citizen_id, phone_number, address, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, full_name, email, citizen_id, phone_number, address, role',
      [full_name, email, hashedPassword, citizen_id, phone_number, address, 'customer']
    );
    res.status(201).json({ message: 'User registered', user: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    res.json({ message: 'Login successful', token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
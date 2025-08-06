import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true, // optional: ถ้าคุณจะส่ง cookie หรือ auth header
}));
app.use(express.json());
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
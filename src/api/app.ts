import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import meRoutes from './routes/me.routes';
import policyRoutes from './routes/policy.routes';
import claimrequestsRoutes from './routes/claimrequests.routes';
import claimsubmitRoutes from './routes/claimsubmit.routes';
import imageAnnotationsRouter from "./routes/imageannotations.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true, // ✅ ต้องเปิดไว้เพื่อให้ส่ง cookie ได้
}));

app.use(express.json());
app.use(cookieParser()); // ✅ ใช้งาน cookie-parser

app.use('/api/auth', authRoutes);
app.use('/api', meRoutes); // ✅ me route
app.use('/api/policy', policyRoutes); // ✅ policy route
app.use('/api/claim-requests', claimrequestsRoutes); // ✅ claim requests route
app.use('/api/claim-submit', claimsubmitRoutes); // ✅ claim submit route
app.use("/api/image-annotations", imageAnnotationsRouter);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

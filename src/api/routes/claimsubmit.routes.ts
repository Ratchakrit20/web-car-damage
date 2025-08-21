// src/api/routes/claimsubmit.routes.ts
import express, { Request, Response } from "express";
import pool from "../models/db"; // <-- path นี้ถูกแล้ว (routes -> models)

const router = express.Router();

// ---------- Types จาก FE ----------
type MediaItem = { url: string; type?: "image" | "video"; publicId?: string };
type DamagePhoto = MediaItem & { side?: "ซ้าย" | "ขวา" | "หน้า" | "หลัง" | "ไม่ระบุ" };

type AccidentDraft = {
  accidentType: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:mm หรือ HH:mm:ss
  province: string | null;
  district: string | null;
  road?: string | null;
  areaType: string;
  nearby?: string | null;
  details?: string | null;
  location: { lat: number; lng: number; accuracy?: number | null };
  evidenceMedia?: MediaItem[];     // ภาพ/วิดีโอหลักฐาน (ไม่มี side)
  damagePhotos?: DamagePhoto[];    // รูปความเสียหาย (มี side)
};

type SubmitBody = {
  user_id: number | null;
  selected_car_id: number;
  accident: AccidentDraft;
  agreed?: boolean;
};

// POST /api/claim-requests/submit
router.post("/submit", async (req: Request, res: Response) => {
  const body = req.body as SubmitBody;

  // ---------- Basic validate ----------
  if (!body?.selected_car_id || !body?.accident) {
    return res.status(400).json({ ok: false, message: "selected_car_id & accident are required" });
  }
  const userId = body.user_id ?? null;
  const carId = Number(body.selected_car_id);
  const draft = body.accident;
  if (!draft?.accidentType || !draft?.date || !draft?.time || !draft?.areaType || !draft?.location) {
    return res.status(400).json({ ok: false, message: "invalid accident payload" });
  }

  const agreed = body.agreed ?? true;

  // ป้องกันประเภทเวลาให้เป็น HH:mm:ss (Postgres time)
  const accidentTime = /^\d{2}:\d{2}(:\d{2})?$/.test(draft.time)
    ? (draft.time.length === 5 ? `${draft.time}:00` : draft.time)
    : "00:00:00";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ---------- 1) accident_details ----------
    const insertAccidentSql = `
      INSERT INTO accident_details
        (accident_type, accident_date, accident_time,
         province, district, road, area_type, nearby, details,
         latitude, longitude, accuracy, file_url, agreed,
         created_at, updated_at, media_type)
      VALUES
        ($1, $2, $3, $4,
         $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14,
         NOW(), NOW(), $15)
      RETURNING id
    `;
    const accValues = [
      draft.accidentType,
      draft.date,                    // YYYY-MM-DD
      accidentTime,                  // HH:mm:ss
      draft.province,
      draft.district,
      draft.road ?? null,
      draft.areaType,
      draft.nearby ?? null,
      draft.details ?? null,
      draft.location.lat,            // numeric(10,6)
      draft.location.lng,            // numeric(10,6)
      draft.location.accuracy ?? null, // numeric(6,2)
      draft.evidenceMedia?.[0]?.url ?? null, // file_url (ย้ายไปเก็บที่ตารางรูป)
      agreed,
      draft.evidenceMedia?.[0]?.type ?? null,
    ];
    const accRes = await client.query(insertAccidentSql, accValues);
    const accidentDetailId: number = accRes.rows[0].id;

    // ---------- 2) claim_requests ----------
    const insertClaimSql = `
      INSERT INTO claim_requests
        (user_id, status, approved_by, approved_at, admin_note,
         selected_car_id, accident_detail_id, created_at, updated_at)
      VALUES
        ($1, 'pending', NULL, NULL, NULL,
         $2, $3, NOW(), NOW())
      RETURNING id
    `;
    const claimRes = await client.query(insertClaimSql, [userId, carId, accidentDetailId]);
    const claimId: number = claimRes.rows[0].id;

    

    // ---------- 3) evaluation_images (url + side) ----------
    const photos: DamagePhoto[] = Array.isArray(draft.damagePhotos) ? draft.damagePhotos : [];
    if (photos.length > 0) {
      const insertImgSql = `
        INSERT INTO evaluation_images (claim_id, original_url, evaluated_url, side, created_at)
        VALUES ($1, $2, NULL, $3, NOW())
      `;
      for (const p of photos) {
        if (!p?.url) continue;
        await client.query(insertImgSql, [claimId, p.url, p.side ?? "ไม่ระบุ"]);
      }
    }

    await client.query("COMMIT");
    return res.status(201).json({
      ok: true,
      data: {
        accident_detail_id: accidentDetailId,
        claim_id: claimId,
        inserted_image_damage: photos.length,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("claim submit error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  } finally {
    client.release();
  }
});

export default router;

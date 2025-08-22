// src/api/routes/claimrequests.routes.ts
import express, { Request, Response } from 'express';
import pool from '../models/db'; // ← path ให้เหมือนที่ไฟล์ขวาคุณใช้

const router = express.Router();

/**
 * POST /api/claim-requests
 * สร้างคำขอเคลมเริ่มต้น (pending)
 * body: { user_id: number; selected_car_id?: number | null }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_id, selected_car_id } = req.body as {
      user_id?: number;
      selected_car_id?: number | null;
    };

    if (!user_id) {
      return res.status(400).json({ ok: false, message: 'user_id is required' });
    }

    const result = await pool.query(
      `INSERT INTO claim_requests
          (user_id, status, approved_by, approved_at, admin_note, selected_car_id)
       VALUES ($1, 'pending', NULL, NULL, NULL, $2)
       RETURNING id, user_id, status, selected_car_id, created_at`,
      [user_id, selected_car_id ?? null]
    );

    return res.status(201).json({ ok: true, claim: result.rows[0] });
  } catch (err) {
    console.error('Create claim error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});


/**
 * GET /api/claimreport/listall
 * ดึงรายการรายงานเคลมทั้งหมด (ทุก user)
 */
router.get("/listall", async (req: Request, res: Response) => {
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 100;

  try {
    const { rows } = await pool.query(
      `
      SELECT
        cr.id AS claim_id,
        cr.user_id,
        cr.status,
        cr.selected_car_id,
        cr.accident_detail_id,
        cr.created_at,

        ad.accident_type,
        ad.accident_date,
        ad.accident_time,
        ad.area_type,
        ad.province, ad.district, ad.road, ad.nearby, ad.details,
        ad.file_url AS thumbnail_url,
        ad.media_type,

        ip.car_brand, ip.car_model, ip.car_year,
        ip.car_license_plate AS license_plate,

        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', ei.id,
                'original_url', ei.original_url,
                'evaluated_url', ei.evaluated_url,
                'side', ei.side
              )
              ORDER BY ei.id ASC
            ), '[]'::json
          )
          FROM evaluation_images ei
          WHERE ei.claim_id = cr.id
        ) AS images

      FROM claim_requests cr
      JOIN accident_details ad ON ad.id = cr.accident_detail_id
      LEFT JOIN insurance_policies ip ON ip.id = cr.selected_car_id
      ORDER BY COALESCE(ad.accident_date, cr.created_at::date) DESC, cr.created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("claimreport list error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});



/**
 * GET /api/claimreport/list?user_id=xxx&limit=100
 * ดึงรายการรายงานเคลมของผู้ใช้ พร้อม accident_details และ evaluation_images (รวมเป็น array)
 */
/* ========= LIST: ทั้งหมดของ user ========= */
router.get("/list", async (req: Request, res: Response) => {
  const userId = req.query.user_id ? Number(req.query.user_id) : null;
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 100;

  try {
    const { rows } = await pool.query(
      `
      SELECT
        cr.id AS claim_id,
        cr.user_id,
        cr.status,
        cr.selected_car_id,
        cr.accident_detail_id,
        cr.created_at,

        ad.accident_type,
        ad.accident_date,
        ad.accident_time,
        ad.area_type,
        ad.province, ad.district, ad.road, ad.nearby, ad.details,
        ad.file_url AS thumbnail_url,
        ad.media_type,

        ip.car_brand, ip.car_model, ip.car_year,
        ip.car_license_plate AS license_plate,

        ( SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', ei.id,
                'original_url', ei.original_url,
                'evaluated_url', ei.evaluated_url,
                'side', ei.side
              )
              ORDER BY ei.id ASC
            ), '[]'::json )
          FROM evaluation_images ei
          WHERE ei.claim_id = cr.id
        ) AS images
      FROM claim_requests cr
      JOIN accident_details ad ON ad.id = cr.accident_detail_id
      LEFT JOIN insurance_policies ip ON ip.id = cr.selected_car_id
      WHERE ($1::int IS NULL OR cr.user_id = $1)
      ORDER BY COALESCE(ad.accident_date, cr.created_at::date) DESC, cr.created_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("claimreport list error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

/* ========= DETAIL: 1 รายการตาม claim_id ========= */
router.get("/detail", async (req: Request, res: Response) => {
  const claimId = req.query.claim_id ? Number(req.query.claim_id) : null;
  const userId = req.query.user_id ? Number(req.query.user_id) : null;
  if (!claimId) {
    return res.status(400).json({ ok: false, message: "claim_id is required" });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        cr.id AS claim_id,
        cr.user_id,
        cr.status,
        cr.selected_car_id,
        cr.accident_detail_id,
        cr.created_at,

        ad.accident_type,
        ad.accident_date,
        ad.accident_time,
        ad.area_type,
        ad.province, ad.district, ad.road, ad.nearby, ad.details,
        ad.latitude, ad.longitude, ad.accuracy,
        ad.file_url AS evidence_file_url,
        ad.media_type,

        ip.car_brand, ip.car_model, ip.car_year,
        ip.car_license_plate AS license_plate,
        ip.insurance_type, ip.policy_number, ip.coverage_end_date,

        ( SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', ei.id,
                'original_url', ei.original_url,
                'evaluated_url', ei.evaluated_url,
                'side', ei.side
              )
              ORDER BY ei.id ASC
            ), '[]'::json )
          FROM evaluation_images ei
          WHERE ei.claim_id = cr.id
        ) AS damage_images
      FROM claim_requests cr
      JOIN accident_details ad ON ad.id = cr.accident_detail_id
      LEFT JOIN insurance_policies ip ON ip.id = cr.selected_car_id
      WHERE cr.id = $1 AND ($2::int IS NULL OR cr.user_id = $2)
      LIMIT 1
      `,
      [claimId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: "claim not found" });
    }

    const r = rows[0];

    const car = r.license_plate
      ? {
          id: r.selected_car_id,
          car_brand: r.car_brand,
          car_model: r.car_model,
          car_year: r.car_year,
          car_license_plate: r.license_plate,
          insurance_type: r.insurance_type,
          policy_number: r.policy_number,
          coverage_end_date: r.coverage_end_date,
        }
      : null;

    const accident = {
      accidentType: r.accident_type,
      date: r.accident_date,
      time: r.accident_time,
      province: r.province,
      district: r.district,
      road: r.road,
      areaType: r.area_type,
      nearby: r.nearby,
      details: r.details,
      location: { lat: r.latitude, lng: r.longitude, accuracy: r.accuracy },
      evidenceMedia: r.evidence_file_url ? [{ url: r.evidence_file_url, type: r.media_type ?? "image" }] : [],
      damagePhotos: Array.isArray(r.damage_images)
        ? r.damage_images.map((img: any) => ({
            url: img.original_url,
            type: "image",
            side: img.side ?? "ไม่ระบุ",
          }))
        : [],
    };

    return res.json({
      ok: true,
      data: {
        claim_id: r.claim_id,
        status: r.status,
        created_at: r.created_at,
        car,
        accident,
      },
    });
  } catch (err) {
    console.error("claimreport detail error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});


/**
 * (ทางเลือก) PATCH /api/claim-requests/:id
 * อัปเดต status / admin_note / approved_by / approved_at
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, admin_note, approved_by, approved_at } = req.body as {
      status?: 'pending' | 'approved' | 'rejected';
      admin_note?: string | null;
      approved_by?: number | null;
      approved_at?: string | null; // ISO datetime
    };

    const result = await pool.query(
      `UPDATE claim_requests SET
         status = COALESCE($1, status),
         admin_note = COALESCE($2, admin_note),
         approved_by = COALESCE($3, approved_by),
         approved_at = COALESCE($4, approved_at::timestamp),
         updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status ?? null, admin_note ?? null, approved_by ?? null, approved_at ?? null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'not found' });
    }
    return res.json({ ok: true, claim: result.rows[0] });
  } catch (err) {
    console.error('Patch claim error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/**
 * (ทางเลือก) PUT /api/claim-requests/:id/accident
 * ผูก claim กับ accident_details.id ที่สร้างในสเต็ปถัดไป
 * body: { accident_detail_id: number }
 */
router.put('/:id/accident', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { accident_detail_id } = req.body as { accident_detail_id?: number };

    if (!accident_detail_id) {
      return res.status(400).json({ ok: false, message: 'accident_detail_id is required' });
    }

    const result = await pool.query(
      `UPDATE claim_requests
         SET accident_detail_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [accident_detail_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'not found' });
    }
    return res.json({ ok: true, claim: result.rows[0] });
  } catch (err) {
    console.error('Attach accident error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

export default router;

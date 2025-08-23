// src/api/routes/imageannotations.routes.ts
import express, { Request, Response } from "express";
import pool from "../models/db";

const router = express.Router();

/* ---------- Types จาก FE ---------- */
type AnnotationInput = {
  part_name: string;
  damage_name: string;
  severity?: "A" | "B" | "C";
  area_percent?: number | null;
  x: number; y: number; w: number; h: number;    // normalized 0..1
  confidence?: number | null;
  mask_iou?: number | null;
  source?: "manual" | "model" | "legacy";
};

type SaveBody = {
  image_id: number;               // = evaluation_images.id
  created_by?: number | null;     // users.id ถ้ามี
  boxes: AnnotationInput[];
};

/* ---------- Utils ---------- */
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round3 = (n: number) => Math.round(n * 1000) / 1000;
function normBox(b: AnnotationInput): AnnotationInput {
  return {
    ...b,
    severity: (b.severity ?? "A") as "A" | "B" | "C",
    area_percent:
      b.area_percent == null ? null : Math.max(0, Math.min(100, Math.round(b.area_percent))),
    x: round3(clamp01(b.x)),
    y: round3(clamp01(b.y)),
    w: round3(Math.max(0.0001, Math.min(1, b.w))),
    h: round3(Math.max(0.0001, Math.min(1, b.h))),
    confidence: b.confidence ?? null,
    mask_iou: b.mask_iou == null ? null : Math.max(0, Math.min(1, b.mask_iou)),
    source: (b.source ?? "manual") as "manual" | "model" | "legacy",
  };
}

/* =========================================================================
 * GET /api/image-annotations/by-image?image_id=123
 *  -> อ่านกล่องทั้งหมดของรูปนั้น
 * ========================================================================= */
router.get("/by-image", async (req: Request, res: Response) => {
  const imageId = Number(req.query.image_id);
  if (!imageId) return res.status(400).json({ ok: false, message: "image_id required" });

  try {
    const { rows } = await pool.query(
      `SELECT id, evaluation_image_id, part_name, damage_name, severity,
              area_percent, x, y, w, h, confidence, mask_iou,
              created_by, created_at, updated_at
       FROM image_damage_annotations
       WHERE evaluation_image_id = $1
       ORDER BY id ASC`,
      [imageId]
    );
    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("annotations by-image error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

/* =========================================================================
 * GET /api/image-annotations/by-claim?claim_id=456  (ตัวเลือก)
 *  -> ดึงทุกกล่องของเคส โดย join ผ่าน evaluation_images
 * ========================================================================= */
router.get("/by-claim", async (req: Request, res: Response) => {
  const claimId = Number(req.query.claim_id);
  if (!claimId) return res.status(400).json({ ok: false, message: "claim_id required" });

  try {
    const { rows } = await pool.query(
      `SELECT ida.*, ei.original_url, ei.side
       FROM image_damage_annotations ida
       JOIN evaluation_images ei ON ei.id = ida.evaluation_image_id
       WHERE ei.claim_id = $1
       ORDER BY ida.created_at`,
      [claimId]
    );
    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("annotations by-claim error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

/* =========================================================================
 * POST /api/image-annotations/save
 * body: { image_id, created_by?, boxes:[{...}] }
 * กลยุทธ์: REPLACE ทั้งชุดของรูปนั้น (ลบเก่า-ใส่ใหม่) ภายใต้ transaction
 *  - ปัดทศนิยม x/y/w/h เป็น 3 ตำแหน่ง ให้ตรงกับ unique index แบบ rounded
 * ========================================================================= */
router.post("/save", async (req: Request, res: Response) => {
  const body = req.body as SaveBody;
  const imageId = Number(body?.image_id);
  const createdBy = body?.created_by ?? null;
  const boxes = Array.isArray(body?.boxes) ? body.boxes.map(normBox) : [];

  if (!imageId) return res.status(400).json({ ok: false, message: "image_id required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ลบของเก่าของรูปนี้
    await client.query(
      `DELETE FROM image_damage_annotations WHERE evaluation_image_id = $1`,
      [imageId]
    );

    if (boxes.length > 0) {
      // build bulk insert
      const cols =
        "(evaluation_image_id, part_name, damage_name, severity, area_percent, x, y, w, h, confidence, mask_iou, source, created_by, created_at)";
      const placeholders: string[] = [];
      const values: any[] = [imageId];
      let p = 2; // เริ่มนับพารามิเตอร์ตั้งแต่ $2 (เพราะ $1 = imageId)

      for (const b of boxes) {
        placeholders.push(
          `($1, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, NOW())`
        );
        values.push(
          b.part_name,
          b.damage_name,
          b.severity ?? "A",
          b.area_percent ?? null,
          b.x, b.y, b.w, b.h,
          b.confidence ?? null,
          b.mask_iou ?? null,
          b.source ?? "manual",
          createdBy
        );
      }

      await client.query(
        `INSERT INTO image_damage_annotations ${cols} VALUES ${placeholders.join(",")}`,
        values
      );
    }

    await client.query("COMMIT");
    return res.status(201).json({ ok: true, saved: boxes.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("annotations save error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  } finally {
    client.release();
  }
});

/* =========================================================================
 * PATCH /api/image-annotations/:id   (ตัวเลือก: แก้ทีละกล่อง)
 * ========================================================================= */
router.patch("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "id required" });

  const b = normBox(req.body as AnnotationInput);
  try {
    const { rowCount } = await pool.query(
      `UPDATE image_damage_annotations
       SET part_name=$1, damage_name=$2, severity=$3, area_percent=$4,
           x=$5, y=$6, w=$7, h=$8, confidence=$9, mask_iou=$10, source=$11, updated_at=NOW()
       WHERE id=$12`,
      [
        b.part_name, b.damage_name, b.severity ?? "A", b.area_percent ?? null,
        b.x, b.y, b.w, b.h,
        b.confidence ?? null, b.mask_iou ?? null, b.source ?? "manual",
        id
      ]
    );
    return res.json({ ok: true, affected: rowCount });
  } catch (err) {
    console.error("annotations patch error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

/* =========================================================================
 * DELETE /api/image-annotations/:id  (ตัวเลือก)
 * ========================================================================= */
router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "id required" });

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM image_damage_annotations WHERE id = $1`,
      [id]
    );
    return res.json({ ok: true, affected: rowCount });
  } catch (err) {
    console.error("annotations delete error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

export default router;

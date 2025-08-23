// src/app/adminpage/reportsrequest/inspect/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@/types/claim";
import InspectHeader from "./InspectHeader";
import ImageList from "./ImageList";
import ImageViewer, { Annotation } from "./ImageViewer";
import DamageTable from "./DamageTable";
import SummaryPanel from "./SummaryPanel";

/* ------------ Types ของคุณ ------------ */
export type MediaItem = {
  url: string;
  type?: "image" | "video";
  publicId?: string;
};

export type DamagePhoto = MediaItem & {
  side?: "ซ้าย" | "ขวา" | "หน้า" | "หลัง" | "ไม่ระบุ";
  // meta อื่น ๆ (optional)
  type?: string | null;
  url?: string | null;
};

export type Car = {
  id: number;
  car_brand: string;
  car_model: string;
  car_year: string | number;
  car_license_plate: string;
  insurance_type: string;
  policy_number: string;
  coverage_end_date: string; // ISO date
};

export type AccidentDraft = {
  accidentType: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm / HH:mm:ss
  province: string | null;
  district: string | null;
  road?: string | null;
  areaType: string;
  nearby?: string | null;
  details?: string | null;
  location: { lat: number; lng: number; accuracy?: number | null };
  evidenceMedia?: MediaItem[];   // หลักฐานทั่วไป
  damagePhotos?: DamagePhoto[];  // รูปความเสียหาย (อาจมี side)
};

type ClaimDetail = {
  claim_id: number | string;
  status?: string;
  created_at?: string;
  car: Car | null;
  accident: AccidentDraft;
};

/* ------------ Config ------------ */
const URL_PREFIX =
  process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");
const DETECT_API_BASE =
  process.env.NEXT_PUBLIC_DETECT_API_BASE || "http://localhost:8000";

/* ------------ Types: API /detect/analyze ------------ */
type AnalyzeDamageResponse = {
  ok: boolean;
  width: number;
  height: number;
  parts: Array<{
    part: string;
    bbox: [number, number, number, number];
    damages: Array<{ class: string; confidence: number; mask_iou: number }>;
  }>;
  overlay_image_b64?: string;
  overlay_mime?: string;
  message?: string;
};
type ModelParams = {
  conf_parts: number;
  conf_damage: number;
  imgsz: number;
  mask_iou_thresh: number;
  render_overlay: boolean;
};

/* ------------ API ------------ */
async function fetchDetail(id: string): Promise<ClaimDetail> {
  const res = await fetch(
    `${URL_PREFIX}/api/claim-requests/detail?claim_id=${encodeURIComponent(id)}`,
    { credentials: "include", cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.message || "โหลดรายละเอียดไม่สำเร็จ");
  return json.data as ClaimDetail;
}

/** เรียก FastAPI /detect/analyze โดยส่งรูปจาก URL */
async function analyzeImageByUrl(
  imageUrl: string,
  params: { conf_parts?: number; conf_damage?: number; imgsz?: number; mask_iou_thresh?: number; render_overlay?: boolean } = {}
): Promise<AnalyzeDamageResponse> {
  // ดึงรูปเป็น blob (ต้องเปิด CORS ที่ที่เก็บรูป)
  const imgResp = await fetch(imageUrl, { mode: "cors" });
  if (!imgResp.ok) throw new Error("โหลดรูปจาก URL ไม่สำเร็จ");
  const blob = await imgResp.blob();
  const file = new File([blob], "upload.jpg", { type: blob.type || "image/jpeg" });

  const qs = new URLSearchParams({
    conf_parts: String(params.conf_parts ?? 0.3),
    conf_damage: String(params.conf_damage ?? 0.25),
    imgsz: String(params.imgsz ?? 640),
    mask_iou_thresh: String(params.mask_iou_thresh ?? 0.1),
    render_overlay: String(params.render_overlay ?? true),
  }).toString();

  const form = new FormData();
  form.append("file", file);

  const resp = await fetch(`${DETECT_API_BASE}/detect/analyze?${qs}`, {
    method: "POST",
    body: form,
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`วิเคราะห์ไม่สำเร็จ: ${txt}`);
  }
  return (await resp.json()) as AnalyzeDamageResponse;
}

/* ------------ Helpers ------------ */
const thDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const readAccidentType = (a?: AccidentDraft | null) => a?.accidentType ?? "-";
const readAccidentDate = (a?: AccidentDraft | null) => thDate(a?.date);

/** แปลงผล parts + bbox → กล่อง Annotation (normalized 0..1) */
function partsToBoxes(
  res: AnalyzeDamageResponse
): Annotation[] {
  const W = res.width || 1;
  const H = res.height || 1;
  const palette = ["#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#3B82F6", "#06B6D4", "#84CC16"];
  let idx = 0;

  return res.parts.map((p) => {
    const [x1, y1, x2, y2] = p.bbox;
    const w = Math.max(1, x2 - x1);
    const h = Math.max(1, y2 - y1);
    const color = palette[idx++ % palette.length];

    const damageText =
      p.damages && p.damages.length
        ? p.damages.map((d) => d.class).join(", ")
        : "-";

    const areaPercent = Math.round(((w * h) / (W * H)) * 100);

    return {
      id: idx,
      part: p.part,
      damage: damageText,
      severity: "A",
      areaPercent,
      color,
      x: x1 / W,
      y: y1 / H,
      w: w / W,
      h: h / H,
    } as Annotation;
  });
}

/* ====================================================================== */
export default function InspectPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const claimId = sp.get("claim_id");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [detail, setDetail] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // รวมรูปจาก type ของคุณ → {url, side?}
  const images = useMemo(() => {
    const arr: { url: string; side?: string }[] = [];
    const acc = detail?.accident;

    acc?.damagePhotos?.forEach((p) => {
      if (p?.url) arr.push({ url: p.url as string, side: p.side ?? undefined });
    });

    return arr;
  }, [detail]);

  // ภาพที่เลือก + กล่องความเสียหาย + ระดับการวิเคราะห์ + overlay ต่อรูป
  const [activeIndex, setActiveIndex] = useState(0);
  const [boxesByIndex, setBoxesByIndex] = useState<Record<number, Annotation[]>>({});
  const currentBoxes = boxesByIndex[activeIndex] ?? [];
  const [analysisLevel, setAnalysisLevel] = useState(50);
  const [overlayByIndex, setOverlayByIndex] = useState<Record<number, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // config model
  const [modelParams, setModelParams] = useState<ModelParams>({
  conf_parts: 0.5,
  conf_damage: 0.25,
  imgsz: 640,
  mask_iou_thresh: 0.1,
  render_overlay: true,
  });
  function paramsFromLevel(level: number): ModelParams {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const t = clamp(level, 0, 100) / 100;

    // ยิ่ง level สูง → ยิ่งละเอียด → ลด conf ลง
    const conf_parts   = Number((0.6 - (0.6 - 0.2) * t).toFixed(2));  // 0→0.60, 100→0.20
    const conf_damage  = Number((0.5 - (0.5 - 0.15) * t).toFixed(2)); // 0→0.50, 100→0.15

    return {
      ...modelParams,
      conf_parts,
      conf_damage,
    };
  }
  const handleChangeLevel = (lvl: number) => {
    setAnalysisLevel(lvl);
    const p = paramsFromLevel(lvl);
    setModelParams(p);
    void analyzeActiveImage(activeIndex, p, true); // บังคับวิเคราะห์ซ้ำด้วยพารามิเตอร์ใหม่
  };
  // -------- Auth --------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/me`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (cancelled) return;
        console.log('Auth data:', data.user);
        setUser(data.user ?? null);
        setIsAuthenticated(Boolean(data.isAuthenticated));
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) router.replace('/login');
  }, [isAuthenticated, router]);
  // โหลดรายละเอียด
  useEffect(() => {
    if (!claimId) { setErr("ไม่พบ claim_id"); setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const d = await fetchDetail(claimId);
        if (!alive) return;
        setDetail(d);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "เกิดข้อผิดพลาด");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [claimId]);

  // วิเคราะห์รูปภาพอัตโนมัติเมื่อมีรูปแรก (ครั้งเดียวต่อ index)
  useEffect(() => {
    if (images.length === 0) return;
    if (overlayByIndex[0]) return; // วิเคราะห์แล้ว
    // auto วิเคราะห์รูปแรก
    void analyzeActiveImage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  // เรียก FastAPI วิเคราะห์ภาพที่เลือก
  async function analyzeActiveImage(index = activeIndex, override?: Partial<ModelParams>, force = false) {
    const img = images[index];
    if (!img?.url) return;
    try {
      setAnalyzing(true);
      setAnalyzeError(null);

      const used = { ...modelParams, ...override };
      const res = await analyzeImageByUrl(img.url, {
        conf_parts: used.conf_parts,
        conf_damage: used.conf_damage,
        imgsz: used.imgsz,
        mask_iou_thresh: used.mask_iou_thresh,
        render_overlay: used.render_overlay,
      });

      // กล่องจาก bbox (แทน seed เดิม)
      const newBoxes = partsToBoxes(res);
      setBoxesByIndex((m) => ({ ...m, [index]: newBoxes }));

      // เก็บ overlay ต่อภาพ
      if (res.overlay_image_b64) {
        const overlayUrl = `data:${res.overlay_mime || "image/jpeg"};base64,${res.overlay_image_b64}`;
        setOverlayByIndex((m) => ({ ...m, [index]: overlayUrl }));
      }
    } catch (e: any) {
      setAnalyzeError(e?.message ?? "วิเคราะห์ภาพไม่สำเร็จ");
    } finally {
      setAnalyzing(false);
    }
  }

  
  // States
  if (!claimId) return <div className="p-6 text-rose-600">ไม่พบ claim_id</div>;
  if (loading)   return <div className="p-6 text-zinc-600">กำลังโหลด…</div>;
  if (err)       return <div className="p-6 text-rose-600">ผิดพลาด: {err}</div>;
  if (!detail)   return null;

  const title =
    `${detail?.car?.car_brand ?? "รถ"} ${detail?.car?.car_model ?? ""} ` +
    `ทะเบียน ${detail?.car?.car_license_plate ?? "-"}`;

  // const mainImageUrl = overlayByIndex[activeIndex] || images[activeIndex]?.url;
  const mainImageUrl = images[activeIndex]?.url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F1F5FF] via-[#F7FAFF] to-white">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 lg:py-8">
        <InspectHeader
          claimId={claimId}
          title={title}
          accidentType={readAccidentType(detail?.accident)}
          accidentDate={readAccidentDate(detail?.accident)}
        />

        {/* responsive: 1 → 6 → 12 คอลัมน์ */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5">
          {/* ซ้าย */}
          <aside className="md:col-span-2 lg:col-span-3">
            <ImageList
              images={images}
              activeIndex={activeIndex}
              onSelect={(i) => {
                setActiveIndex(i);
                // ถ้ายังไม่เคยวิเคราะห์ภาพนี้ ให้ลองวิเคราะห์เมื่อเลือก
                if (!overlayByIndex[i] && !boxesByIndex[i]) {
                  void analyzeActiveImage(i);
                }
              }}
              onBack={() => router.push('/adminpage/reportsrequest')}
            />
          </aside>

          {/* กลาง */}
          <section className="md:col-span-4 lg:col-span-6">
            <ImageViewer
              imageUrl={mainImageUrl}
              imageLabel={images[activeIndex]?.side}
              boxes={currentBoxes}
              onAddBox={() => {
                const id = (currentBoxes.at(-1)?.id ?? 0) + 1;
                const colors = ["#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#3B82F6"];
                const color = colors[id % colors.length];
                setBoxesByIndex((m) => ({
                  ...m,
                  [activeIndex]: [
                    ...(m[activeIndex] ?? []),
                    { id, part: `จุดที่ ${id}`, damage: "-", severity: "B", areaPercent: 10, color, x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
                  ],
                }));
              }}
            />

            {/* Action row: วิเคราะห์ภาพนี้ */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                {analyzing ? "กำลังวิเคราะห์ภาพ…" : analyzeError ? `ผิดพลาด: ${analyzeError}` : "ผลวิเคราะห์จากโมเดล YOLO จะวาดกรอบอัตโนมัติ"}
              </div>
              <button
                disabled={analyzing || !images[activeIndex]?.url}
                onClick={() => analyzeActiveImage(activeIndex)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                  analyzing
                    ? "bg-zinc-200 text-zinc-500"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {analyzing ? "กำลังวิเคราะห์…" : "วิเคราะห์ภาพนี้"}
              </button>
            </div>

            <DamageTable
              boxes={currentBoxes}
              onChange={(next) =>
                setBoxesByIndex((m) => ({
                  ...m,
                  [activeIndex]: (m[activeIndex] ?? []).map((x) => (x.id === next.id ? next : x)),
                }))
              }
              onRemove={(id) =>
                setBoxesByIndex((m) => ({
                  ...m,
                  [activeIndex]: (m[activeIndex] ?? []).filter((x) => x.id !== id),
                }))
              }
              onDone={() => router.push(`/adminpage/reportsrequest`)}
            />
          </section>

          {/* ขวา */}
          <aside className="md:col-span-6 lg:col-span-3">
            <SummaryPanel
              boxes={currentBoxes}
              analysisLevel={analysisLevel}
              onChangeLevel={handleChangeLevel}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

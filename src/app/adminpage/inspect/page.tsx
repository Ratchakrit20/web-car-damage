// src/app/adminpage/reportsrequest/inspect/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

/* ------------ Helpers ------------ */
const thDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const readAccidentType = (a?: AccidentDraft | null) => a?.accidentType ?? "-";
const readAccidentDate = (a?: AccidentDraft | null) => thDate(a?.date);

/* ====================================================================== */
export default function InspectPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const claimId = sp.get("claim_id");

  const [detail, setDetail] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // รวมรูปจาก type ของคุณ → {url, side?} เพื่อส่งให้ ImageList/ImageViewer
  const images = useMemo(() => {
    const arr: { url: string; side?: string }[] = [];
    const acc = detail?.accident;

    acc?.damagePhotos?.forEach((p) => {
      if (p?.url) arr.push({ url: p.url as string, side: p.side ?? undefined });
    });

    return arr;
  }, [detail]);

  // ภาพที่เลือก + กล่องความเสียหาย + ระดับการวิเคราะห์
  const [activeIndex, setActiveIndex] = useState(0);
  const [boxes, setBoxes] = useState<Annotation[]>([]);
  const [analysisLevel, setAnalysisLevel] = useState(70);

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

        // seed กล่องตัวอย่างให้ “เหมือนรูปแรก”
        setBoxes([
          { id: 1, part: "ประตูหน้า",     damage: "บุบ",  severity: "A", areaPercent: 70, color: "#F59E0B", x: 0.05, y: 0.35, w: 0.55, h: 0.35 },
          { id: 2, part: "กระจกมองหลัง", damage: "-",    severity: "A", areaPercent: 9,  color: "#8B5CF6", x: 0.46, y: 0.05, w: 0.30, h: 0.18 },
          { id: 3, part: "ล้อหน้า",       damage: "แตก",  severity: "A", areaPercent: 21, color: "#EF4444", x: 0.67, y: 0.48, w: 0.18, h: 0.33 },
        ]);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "เกิดข้อผิดพลาด");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [claimId]);

  // handlers
  const handleAddBox = () => {
    const id = (boxes.at(-1)?.id ?? 0) + 1;
    const colors = ["#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#3B82F6"];
    const color = colors[id % colors.length];
    setBoxes((xs) => [
      ...xs,
      { id, part: `จุดที่ ${id}`, damage: "-", severity: "B", areaPercent: 10, color, x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
    ]);
  };

  const handleUpdateBox = (next: Annotation) =>
    setBoxes((xs) => xs.map((x) => (x.id === next.id ? next : x)));

  const handleRemoveBox = (id: number) =>
    setBoxes((xs) => xs.filter((x) => x.id !== id));

  // States
  if (!claimId) return <div className="p-6 text-rose-600">ไม่พบ claim_id</div>;
  if (loading)   return <div className="p-6 text-zinc-600">กำลังโหลด…</div>;
  if (err)       return <div className="p-6 text-rose-600">ผิดพลาด: {err}</div>;
  if (!detail)   return null;

  const title =
    `${detail?.car?.car_brand ?? "รถ"} ${detail?.car?.car_model ?? ""} ` +
    `ทะเบียน ${detail?.car?.car_license_plate ?? "-"}`;

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
              onSelect={setActiveIndex}
            />
          </aside>

          {/* กลาง */}
          <section className="md:col-span-4 lg:col-span-6">
            <ImageViewer
              imageUrl={images[activeIndex]?.url}
              imageLabel={images[activeIndex]?.side}
              boxes={boxes}
              onAddBox={handleAddBox}
            />
            <DamageTable
              boxes={boxes}
              onChange={handleUpdateBox}
              onRemove={handleRemoveBox}
              onDone={() => router.push(`/adminpage/reportsrequest`)}
            />
          </section>

          {/* ขวา */}
          <aside className="md:col-span-6 lg:col-span-3">
            <SummaryPanel
              boxes={boxes}
              analysisLevel={analysisLevel}
              onChangeLevel={setAnalysisLevel}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

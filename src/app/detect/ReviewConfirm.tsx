// components/ReviewConfirm.tsx
"use client";

import React, { useMemo, useState } from "react";
import EvidenceGallery from "../components/EvidenceGallery";

// ---------- Types ----------
type Car = {
  id: number;
  car_brand: string;
  car_model: string;
  car_year: string | number;
  car_license_plate: string;
  insurance_type: string;
  policy_number: string;
  coverage_end_date: string;
};

type MediaItem = { url: string; type?: "image" | "video"; publicId?: string };

type DamagePhoto = MediaItem & {
  // ฝั่ง AccidentDetails อาจแนบ side/total/perClass มาด้วย
  // แต่หน้านี้จะไม่ใช้ (แสดงเฉพาะรูป)
  side?: "ซ้าย" | "ขวา" | "หน้า" | "หลัง" | "ไม่ระบุ";
  total?: number | null;
  perClass?: Record<string, number> | null;
};

type AccidentDraft = {
  accidentType: string;
  date: string;
  time: string;
  province: string | null;
  district: string | null;
  road?: string | null;
  areaType: string;
  nearby?: string | null;
  details?: string | null;
  location: { lat: number; lng: number; accuracy?: number | null };

  // แบบใหม่
  evidenceMedia?: MediaItem[];
  damagePhotos?: DamagePhoto[];
};

interface ReviewConfirmProps {
  onBack: () => void;
  onFinish: () => void;
  userId?: number;
}

const CAR_KEY = "claimSelectedCar";
const ACC_KEY = "accidentDraft";

// ---------- Helpers ----------
function isVideoUrl(url: string) {
  const u = url.toLowerCase();
  return u.endsWith(".mp4") || u.endsWith(".mov") || u.endsWith(".webm") || u.includes("video/upload");
}
function normalizeMediaItem(m: string | MediaItem): MediaItem {
  if (typeof m === "string") {
    return { url: m, type: isVideoUrl(m) ? "video" : "image" };
  }
  if (!m.type) {
    return { ...m, type: isVideoUrl(m.url) ? "video" : "image" };
  }
  return m;
}

// ---------- Component ----------
export default function ReviewConfirm({ onBack, onFinish, userId }: ReviewConfirmProps) {
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const car: Car | null = useMemo(() => {
    try {
      const raw = localStorage.getItem(CAR_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const draft: AccidentDraft | null = useMemo(() => {
    try {
      const raw = localStorage.getItem(ACC_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // รูปหลักฐาน:
  // - ถ้ามี evidenceMedia (ใหม่) ใช้อันนี้
  const evidenceList: (string | MediaItem)[] = useMemo(() => {
    if (!draft) return [];
    if (Array.isArray(draft.evidenceMedia) && draft.evidenceMedia.length > 0) {
      return draft.evidenceMedia.map(normalizeMediaItem);
    }
    return [];
  }, [draft]);

  // รูปความเสียหาย: แปลงเฉพาะ url/type/publicId (ไม่ดึงค่า AI)
  const damageList: (string | MediaItem)[] = useMemo(() => {
    if (!draft?.damagePhotos || draft.damagePhotos.length === 0) return [];
    return draft.damagePhotos
      .filter((d) => !!d?.url)
      .map((d) => normalizeMediaItem({ url: d.url, type: d.type, publicId: d.publicId }));
  }, [draft?.damagePhotos]);

  const handleSubmit = async () => {
    if (!agree || !car || !draft) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/claim-submit/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          selected_car_id: car.id,
          accident: draft,
          agreed: agree,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        alert(data?.message || "ส่งคำขอไม่สำเร็จ");
        return;
      }
      localStorage.removeItem(ACC_KEY);
      onFinish();
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดระหว่างส่งคำขอ");
    } finally {
      setSubmitting(false);
    }
  };

  if (!car || !draft) {
    return (
      <div className="mx-auto max-w-3xl text-center p-6">
        <p className="text-zinc-300">ไม่พบข้อมูลรถหรือรายละเอียดอุบัติเหตุ</p>
        <button onClick={onBack} className="mt-4 rounded-lg bg-zinc-700 px-4 py-2">
          ย้อนกลับ
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl bg-white text-zinc-900 rounded-2xl p-6 shadow-lg">
      <h1 className="text-2xl font-extrabold text-center">รายงานการเคลม</h1>

      {/* รายละเอียดรถ */}
      <section className="mt-6">
        <h2 className="font-semibold text-center">รายละเอียดรถ</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Row k="ยี่ห้อ - รุ่น" v={`${car.car_brand} ${car.car_model}`} />
          <Row k="ทะเบียน" v={car.car_license_plate} />
          <Row k="ประเภทประกัน" v={car.insurance_type} />
          <Row k="เลขที่กรมธรรม์" v={car.policy_number} />
          <Row k="ปีผลิต" v={String(car.car_year)} />
          <Row k="วันหมดอายุ" v={new Date(car.coverage_end_date).toLocaleDateString("th-TH")} />
        </div>
        <hr className="my-4" />
      </section>

      {/* รายละเอียดอุบัติเหตุ */}
      <section>
        <h2 className="font-semibold text-center">รายละเอียดอุบัติเหตุ</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <Row k="วันที่/เวลา" v={`${draft.date}  เวลา: ${draft.time}`} />
          <Row k="ประเภท" v={draft.accidentType} />
          <Row k="จังหวัด/อำเภอ" v={`${draft.province ?? "-"} / ${draft.district ?? "-"}`} />
          <Row k="ประเภทพื้นที่" v={draft.areaType} />
          <Row k="ถนน" v={draft.road || "-"} />
          <Row k="จุดสังเกต" v={draft.nearby || "-"} />
          <Row
            k="พิกัด"
            v={`Lat ${draft.location.lat?.toFixed?.(6) ?? draft.location.lat}, Lng ${draft.location.lng?.toFixed?.(6) ?? draft.location.lng}`}
          />
        </div>
        {draft.details && (
          <div className="mt-3 text-sm">
            <div className="font-medium">รายละเอียดเพิ่มเติม</div>
            <div className="whitespace-pre-wrap">{draft.details}</div>
          </div>
        )}
        <hr className="my-4" />
      </section>

      {/* รูปหลักฐาน */}
      {evidenceList.length > 0 && (
        <section>
          <EvidenceGallery
            media={evidenceList}
            title="รูปหลักฐาน"
            thumbWidth={800}
          />
        </section>
      )}

      {/* รูปความเสียหาย */}
      {damageList.length > 0 && (
        <section className="mt-6">
          <EvidenceGallery
            media={damageList}
            title="รูปความเสียหาย"
            thumbWidth={800}
          />
        </section>
      )}

      {/* ยืนยัน */}
      <div className="flex items-start gap-3 mt-4">
        <input
          id="agree"
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1"
        />
        <label htmlFor="agree" className="text-sm">
          ตรวจสอบข้อมูลข้างต้นครบถ้วนแล้ว และยืนยันการส่งคำขอเคลม
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onBack} className="rounded-lg bg-zinc-200 px-4 py-2 text-sm hover:bg-zinc-300">
          แก้ไขข้อมูล
        </button>
        <button
          onClick={handleSubmit}
          disabled={!agree || submitting}
          className={`rounded-lg px-4 py-2 text-sm text-white ${
            !agree || submitting ? "bg-zinc-400" : "bg-indigo-600 hover:bg-indigo-500"
          }`}
        >
          {submitting ? "กำลังส่ง..." : "ยืนยันส่งเรื่อง"}
        </button>
      </div>
    </div>
  );
}

// ---------- Small presentational helpers ----------
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <div className="text-zinc-500">{k}</div>
      <div className="font-medium text-right">{v}</div>
    </div>
  );
}

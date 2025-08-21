"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import DamagePhotosPanel, { DamagePhotoItem } from "../components/DamagePhotosPanel";
import SafeAreaSpacer from "../components/SafeAreaSpacer";

interface AccidentDetailsProps { onNext: () => void; onBack: () => void; }

type MediaItem = { url: string; type: "image" | "video"; publicId?: string };
type AccidentType =
  | "ชนเอง/ล้ม" | "ถูกของตกใส่" | "ชนท้าย" | "รถถูกชนขณะจอดอยู่" | "กรูดขอบทาง/ฟุตบาท" | "อื่นๆ";

const ACCIDENT_TYPES: { key: AccidentType; label: string; icon?: string }[] = [
  { key: "ชนเอง/ล้ม", label: "ชนเอง/ล้ม", icon: "💥" },
  { key: "ถูกของตกใส่", label: "ถูกของตกใส่", icon: "🌳" },
  { key: "ชนท้าย", label: "ชนท้าย", icon: "🚗" },
  { key: "รถถูกชนขณะจอดอยู่", label: "จอดอยู่", icon: "🅿️" },
  { key: "กรูดขอบทาง/ฟุตบาท", label: "กรูดฟุตบาท", icon: "🧱" },
  { key: "อื่นๆ", label: "อื่น ๆ", icon: "⋯" },
];

const DISTRICTS_BY_PROVINCE: Record<string, string[]> = {
  กรุงเทพมหานคร: ["พระนคร","ดุสิต","หนองจอก","บางรัก","บางเขน","บางกะปิ","ปทุมวัน","ป้อมปราบศัตรูพ่าย"],
  นนทบุรี: ["เมืองนนทบุรี","บางบัวทอง","ปากเกร็ด","บางกรวย","บางใหญ่","ไทรน้อย"],
  ปทุมธานี: ["เมืองปทุมธานี","คลองหลวง","ธัญบุรี","หนองเสือ","ลาดหลุมแก้ว","ลำลูกกา"],
  สมุทรปราการ: ["เมืองสมุทรปราการ","บางบ่อ","บางพลี","พระประแดง","พระสมุทรเจดีย์","บางเสาธง"],
  ชลบุรี: ["เมืองชลบุรี","บางละมุง","ศรีราชา","พานทอง","สัตหีบ"],
  เชียงใหม่: ["เมืองเชียงใหม่","สารภี","สันทราย","สันกำแพง","แม่ริม","หางดง"],
  นครราชสีมา: ["เมืองนครราชสีมา","ปากช่อง","โนนสูง","สูงเนิน","สีคิ้ว"],
  ขอนแก่น: ["เมืองขอนแก่น","บ้านไผ่","น้ำพอง","ชุมแพ","พล"],
  ภูเก็ต: ["เมืองภูเก็ต","กะทู้","ถลาง"],
};
const PROVINCES = Object.keys(DISTRICTS_BY_PROVINCE);

/* ---------- helpers (คงสไตล์ input เดิม) ---------- */

function labelEl(text: string, required?: boolean, hint?: string) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="text-sm font-medium text-zinc-800">{text}</span>
      {required && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">จำเป็น</span>}
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </div>
  );
}

function fieldSurface({
  required, filled, invalid,
}: { required?: boolean; filled?: boolean; invalid?: boolean }) {
  const base = "rounded-xl border px-3 py-2 sm:py-2.5 text-zinc-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)] transition outline-none w-full";
  if (invalid) return `${base} bg-rose-50 border-rose-300 focus:ring-2 focus:ring-rose-500`;
  if (required && !filled) return `${base} bg-violet-50 border-violet-200 focus:ring-2 focus:ring-violet-500`;
  return `${base} bg-white border-zinc-200 focus:ring-2 focus:ring-violet-500`;
}

function FieldWithIcon({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative min-w-0 w-full">
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">{icon}</span>}
      <div className={icon ? "pl-8 min-w-0 w-full" : "min-w-0 w-full"}>{children}</div>
    </div>
  );
}

/* ---------- component ---------- */

export default function AccidentDetails({ onNext, onBack }: AccidentDetailsProps) {
  const [accidentType, setAccidentType] = useState<AccidentType>("ชนท้าย");
  const [date, setDate] = useState(""); const [time, setTime] = useState("");
  const [province, setProvince] = useState(""); const [district, setDistrict] = useState("");
  const [road, setRoad] = useState(""); const [areaType, setAreaType] = useState("");
  const [nearby, setNearby] = useState(""); const [details, setDetails] = useState("");

  const [lat, setLat] = useState<string>(""); const [lng, setLng] = useState<string>("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [geoError, setGeoError] = useState<string>("");

  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [damageItems, setDamageItems] = useState<DamagePhotoItem[]>([]);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    setDistrict("");
    try {
      const raw = localStorage.getItem("claimSelectedCar");
      const selectedCar = raw ? JSON.parse(raw) : null;
      if (selectedCar?.id) console.log("🚗 Car ID:", selectedCar.id);
    } catch {}
  }, [province]);

  const isValid = useMemo(() => {
    const hasNearby  = nearby.trim().length > 0;
    const hasDetails = details.trim().length > 0;     // ← เพิ่ม

    return Boolean(
      date &&
      time &&
      areaType &&
      lat &&
      lng &&
      hasNearby &&                                     // จุดสังเกตต้องมี
      hasDetails &&                                    // รายละเอียดต้องมี
      agreed &&
      evidenceFiles.length > 0 &&
      damageItems.length > 0
    );
  }, [date, time, areaType, lat, lng, nearby, details, agreed, evidenceFiles.length, damageItems.length]);


  const handleGetLocation = () => {
    if (!("geolocation" in navigator)) { setGeoStatus("error"); setGeoError("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง"); return; }
    setGeoStatus("loading"); setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { const { latitude, longitude, accuracy } = pos.coords;
        setLat(latitude.toFixed(6)); setLng(longitude.toFixed(6));
        setAccuracy(accuracy || null); setGeoStatus("success"); },
      (err) => { setGeoStatus("error"); setGeoError(err.message || "ไม่สามารถดึงตำแหน่งได้"); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  async function uploadToCloudinary(file: File): Promise<MediaItem> {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD!;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET!;
    const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", preset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Upload failed");
    return { url: data.secure_url as string, type: data.resource_type as "image" | "video", publicId: data.public_id as string };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!isValid) return;
    try {
      const evidenceMedia: MediaItem[] = await Promise.all(evidenceFiles.map(uploadToCloudinary));
      const damagePhotos = await Promise.all(
        damageItems.map(async (it) => {
          const up = await uploadToCloudinary(it.file);
          return { url: up.url, type: up.type, publicId: up.publicId, side: it.side, total: it.total, perClass: it.perClass };
        })
      );
      const orNull = (v: string) => (v && v.trim() !== "" && v.trim() !== "-" ? v.trim() : null);
      const payload = {
        accidentType, date, time,
        province: orNull(province), district: orNull(district), road: orNull(road),
        areaType, nearby, details,
        location: { lat: Number(lat), lng: Number(lng), accuracy },
        evidenceMedia, damagePhotos,
      };
      localStorage.setItem("accidentDraft", JSON.stringify(payload));
      onNext();
    } catch (err: any) {
      alert(`อัปโหลดไฟล์ไม่สำเร็จ: ${err?.message ?? "ลองใหม่อีกครั้ง"}`);
    }
  };

  return (
    <div className="acc-page box-border mx-auto max-w-5xl px-3 sm:px-4 md:px-6 overflow-x-hidden">
      {/* ชิปเลือกชนิดอุบัติเหตุ */}
      <div className="mb-5">
        <div className="-mx-3 px-3 py-3 sm:mx-0 sm:px-0 chip-scroller flex gap-3 sm:gap-4 overflow-x-auto">
          {ACCIDENT_TYPES.map(t => {
            const active = accidentType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setAccidentType(t.key)}
                className={[
                  "snap-start shrink-0 w-[150px] sm:w-[180px] h-16 rounded-2xl transition text-sm ring-1",
                  active ? "bg-violet-100 text-violet-900 ring-violet-300"
                         : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50",
                ].join(" ")}
              >
                <div className="flex h-full items-center justify-center gap-2">
                  <span className="text-base sm:text-lg">{t.icon}</span>
                  <span className="font-medium">{t.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ฟอร์ม */}
      <form onSubmit={handleSubmit} className="box-border max-w-full overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 shadow-sm p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-violet-500" />
          <h2 className="text-base sm:text-lg font-semibold text-zinc-900">รายละเอียดอุบัติเหตุ</h2>
          <div className="h-2 w-2 rounded-full bg-violet-500" />
        </div>

        {/* 1) ข้อมูลพื้นฐาน */}
        <div className="min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="min-w-0">
            {labelEl("วันที่เกิดอุบัติเหตุ", true)}
            <FieldWithIcon icon={<span>📅</span>}>
              <input type="date" className={fieldSurface({ required: true, filled: !!date })} value={date} onChange={(e) => setDate(e.target.value)} required />
            </FieldWithIcon>
          </div>

          <div className="min-w-0">
            {labelEl("เวลาเกิดอุบัติเหตุ", true)}
            <FieldWithIcon icon={<span>⏰</span>}>
              <input type="time" className={fieldSurface({ required: true, filled: !!time })} value={time} onChange={(e) => setTime(e.target.value)} required />
            </FieldWithIcon>
          </div>

          <div className="min-w-0">
            {labelEl("จังหวัด")}
            <FieldWithIcon icon={<span>📍</span>}>
              <select className={fieldSurface({ filled: !!province })} value={province} onChange={(e) => { const v = e.target.value; setProvince(v); if (!v) setDistrict(""); }}>
                <option value="">ไม่ระบุ</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </FieldWithIcon>
          </div>

          <div className="min-w-0">
            {labelEl("อำเภอ/เขต", false, !province ? "เลือกจังหวัดก่อน" : undefined)}
            <FieldWithIcon icon={<span>🏷️</span>}>
              <select className={fieldSurface({ filled: !!district })} value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!province}>
                <option value="">{province ? "ไม่ระบุ" : "—"}</option>
                {(DISTRICTS_BY_PROVINCE[province] || []).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FieldWithIcon>
          </div>

          <div className="md:col-span-2 min-w-0">
            {labelEl("ถนน", false, "ปล่อยว่างได้ถ้าไม่ทราบ")}
            <FieldWithIcon icon={<span>🛣️</span>}>
              <input type="text" className={fieldSurface({ filled: !!road })} placeholder="เช่น ถนนสุขุมวิท, มิตรภาพ…" value={road} onChange={(e) => setRoad(e.target.value)} />
            </FieldWithIcon>
          </div>

          <div className="min-w-0">
            {labelEl("ประเภทพื้นที่", true)}
            <FieldWithIcon icon={<span>🗺️</span>}>
              <select className={fieldSurface({ required: true, filled: !!areaType })} value={areaType} onChange={(e) => setAreaType(e.target.value)} required>
                <option value="">โปรดเลือก</option>
                <option>ทางหลวง</option><option>ชุมชน/หมู่บ้าน</option><option>ในเมือง</option>
                <option>ต่างจังหวัด</option><option>ลานจอดรถ</option><option>อื่นๆ</option>
              </select>
            </FieldWithIcon>
          </div>
        </div>

        {/* 2) จุดสังเกต + พิกัด */}
        <div className="mt-6 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="min-w-0">
            {labelEl("จุดสังเกตใกล้เคียง", true)}
            <FieldWithIcon icon={<span>📌</span>}>
              <textarea
                className={fieldSurface({ required: true, filled: nearby.trim().length > 0 }) + " min-h-[96px]"}
                placeholder="เช่น ใกล้ปั๊มน้ำมัน/หน้าร้านสะดวกซื้อ/หน้าซอย…"
                value={nearby}
                onChange={(e) => setNearby(e.target.value)}
                required
              />
            </FieldWithIcon>
          </div>

          <div className="min-w-0">
            {labelEl("ตำแหน่งที่เกิดเหตุ (GPS ไม่ใช้แผนที่)")}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
              <button type="button" onClick={handleGetLocation} className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-400" disabled={geoStatus === "loading"}>
                {geoStatus === "loading" ? "กำลังดึงตำแหน่ง..." : "ดึงตำแหน่งปัจจุบัน"}
              </button>
              {geoStatus === "error" && <span className="text-xs text-rose-500">{geoError}</span>}
              {geoStatus === "success" && <span className="text-xs text-zinc-500">ความแม่นยำ ~{accuracy ? Math.round(accuracy) : "-"} m</span>}
            </div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FieldWithIcon icon={<span>📈</span>}>
                <input type="text" inputMode="decimal" placeholder="ละติจูด (lat)" value={lat} onChange={(e) => setLat(e.target.value)} className={fieldSurface({ required: true, filled: !!lat })} />
              </FieldWithIcon>
              <FieldWithIcon icon={<span>📉</span>}>
                <input type="text" inputMode="decimal" placeholder="ลองจิจูด (lng)" value={lng} onChange={(e) => setLng(e.target.value)} className={fieldSurface({ required: true, filled: !!lng })} />
              </FieldWithIcon>
            </div>
            <p className="mt-1 text-xs text-zinc-500">ตัวอย่าง 13.736717, 100.523186</p>
          </div>
        </div>

        {/* 3) รายละเอียดเพิ่มเติม */}
        <div className="mt-6 min-w-0">
          {labelEl("รายละเอียดเพิ่มเติม", true)}
          <FieldWithIcon icon={<span>📝</span>}>
            <textarea
              className={fieldSurface({ required: true, filled: details.trim().length > 0 }) + " min-h-[96px]"}
              placeholder="อธิบายเหตุการณ์โดยย่อ"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
            />
          </FieldWithIcon>
        </div>


        {/* 4) รูปความเสียหาย + AI */}
        <div className="mt-6 min-w-0">
          {labelEl("รูปความเสียหาย + วิเคราะห์ด้วย AI")}
          <div className="rounded-xl ring-1 ring-zinc-200 bg-zinc-50 p-3 sm:p-4 overflow-hidden">
            <DamagePhotosPanel apiBaseUrl={process.env.NEXT_PUBLIC_DETECT_API_URL as string} onChange={setDamageItems} />
          </div>
        </div>

        {/* 5) อัปโหลดหลักฐาน */}
        <div className="mt-6 min-w-0">
          {labelEl("อัปโหลดรูปหรือวิดีโอที่เกิดเหตุ", true)}
          <input
            type="file" accept="image/*,video/*" multiple
            onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))}
            className="block w-full cursor-pointer rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-white hover:file:bg-zinc-700"
            required
          />
          <p className="mt-1 text-xs text-zinc-500">รองรับรูป/วิดีโอ (แนะนำรวม ≤ 100MB)</p>
          {evidenceFiles.length > 0 && (
            <ul className="mt-2 max-h-40 overflow-auto list-disc space-y-1 pl-5 text-xs text-zinc-600 break-all">
              {evidenceFiles.map((f, i) => (<li key={i}>{f.name}</li>))}
            </ul>
          )}
        </div>

        {/* 6) ยินยอม */}
        <div className="mt-6 flex items-start gap-2">
          <input id="agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500" />
          <label htmlFor="agree" className="text-sm text-zinc-700">ข้าพเจ้ายืนยันว่าข้อมูลถูกต้องและอนุญาตให้ใช้เพื่อการดำเนินการเคลม</label>
        </div>

        {/* ปุ่ม */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={onBack} className="w-full sm:w-auto rounded-xl bg-zinc-200 text-zinc-800 hover:bg-zinc-300 px-4 py-3 sm:py-2 text-sm">ย้อนกลับ</button>
          <button type="submit" disabled={!isValid} className={`w-full sm:w-auto rounded-xl px-4 py-3 sm:py-2 text-sm font-medium text-white shadow-sm ${isValid ? "bg-violet-600 hover:bg-violet-700" : "bg-zinc-400 cursor-not-allowed"}`}>ดำเนินการต่อ</button>
        </div>
      </form>

      {/* กัน bottom bar ทับเหมือนหน้า CarSelection */}
      <SafeAreaSpacer />
          
      {/* กันล้นเฉพาะหน้านี้ */}
      <style jsx global>{`
        .acc-page { max-width: 100vw; overflow-x: hidden; }
        .acc-page * { min-width: 0; }
        .chip-scroller {
          overflow-x: auto; scroll-snap-type: x mandatory;
          -ms-overflow-style: none; scrollbar-width: none;
        }
        .chip-scroller::-webkit-scrollbar { display: none; }
        .acc-page input, .acc-page select, .acc-page textarea { max-width: 100%; }
        .acc-page img, .acc-page video { max-width: 100%; height: auto; }
      `}</style>
    </div>
  );
}

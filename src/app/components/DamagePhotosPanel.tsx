"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// ---------- Types ----------
export type DamageSide = "ซ้าย" | "ขวา" | "หน้า" | "หลัง" | "ไม่ระบุ";

export type DamagePhotoItem = {
  id: string;
  file: File;
  previewUrl: string;
  side: DamageSide;
  detecting: boolean;
  error?: string;

  // ผลลัพธ์จาก /detect/count
  total?: number;
  perClass?: Record<string, number>;
};

type Props = {
  apiBaseUrl: string;          // เช่น "http://localhost:8000"
  onChange?: (items: DamagePhotoItem[]) => void;
  maxTotalMB?: number;         // แสดงคำแนะนำรวมไฟล์ (ดีฟอลต์ 100MB)
};

// ---------- Component ----------
export default function DamagePhotosPanel({
  apiBaseUrl,
  onChange,
  maxTotalMB = 100,
}: Props) {
    const [items, setItems] = useState<DamagePhotoItem[]>([]);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // รวมขนาดไฟล์ทั้งหมด (MB) ไว้แสดงเฉย ๆ
    const totalMB = useMemo(
        () => items.reduce((s, it) => s + it.file.size, 0) / (1024 * 1024),
        [items]
    );

    // อัปเดต state ภายในลูก (ห้ามเรียก onChange ตรงนี้)
    const update = (fn: (prev: DamagePhotoItem[]) => DamagePhotoItem[]) => {
        setItems((prev) => fn(prev));
    };

  // ---- แจ้งพาเรนต์อย่างปลอดภัยด้วย ref + effect ----
    // เก็บ callback ไว้ใน ref พร้อมค่าเริ่มต้น
    const onChangeRef = useRef<Props["onChange"] | null>(null);

    // sync ค่า onChange ล่าสุดเข้า ref ทุกครั้งที่ prop เปลี่ยน
    useEffect(() => {
    onChangeRef.current = onChange ?? null;
    }, [onChange]);

    // เรียก callback หลัง items เปลี่ยน (หลีกเลี่ยงการเรียกระหว่าง render)
    useEffect(() => {
    onChangeRef.current?.(items);
    }, [items]);
  // ------------------------------------------------------

    // เพิ่มรูป (รับเฉพาะ image/*)
    const addFiles = (files: FileList | null) => {
        if (!files) return;
        const newOnes: DamagePhotoItem[] = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .map((file) => ({
            id: crypto.randomUUID(),
            file,
            previewUrl: URL.createObjectURL(file),
            side: "ไม่ระบุ",
            detecting: false,
        }));
        update((prev) => [...prev, ...newOnes]);
    };

    // ลบรูป
    const removeOne = (id: string) => {
        update((prev) => {
        const it = prev.find((x) => x.id === id);
        if (it) URL.revokeObjectURL(it.previewUrl);
        return prev.filter((x) => x.id !== id);
        });
    };

    // เคลียร์ object URL เมื่อ unmount (กัน memory leak)
    useEffect(() => {
        return () => {
        items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
        };
        // ใส่ [] จะไม่ revoke รายตัวเวลาลบ (เรามี revoke ใน removeOne แล้ว)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ตั้งค่าด้านของรถ
    const setSide = (id: string, side: DamageSide) =>
        update((prev) => prev.map((x) => (x.id === id ? { ...x, side } : x)));

    // เรียก /detect/count กับรูปเดียว
    const detectOne = async (id: string) => {
        // เคลียร์ error + set loading
        update((prev) => prev.map((x) => (x.id === id ? { ...x, detecting: true, error: undefined } : x)));
        const it = items.find((x) => x.id === id);
        if (!it) return;

        try {
        const fd = new FormData();
        fd.append("file", it.file);
        // เผื่ออนาคตอยากใช้ด้านรถเป็น context ฝั่งเซิร์ฟเวอร์:
        fd.append("side_hint", it.side);

        // กันเคสมี / ท้าย baseUrl
        const base = apiBaseUrl.replace(/\/$/, "");
        const res = await fetch(`${base}/detect/count`, { method: "POST", body: fd });

        if (!res.ok) {
            let msg = `HTTP ${res.status}`;
            try {
            const err = await res.json();
            msg = err?.detail || err?.error || msg;
            } catch {}
            throw new Error(msg);
        }

        const data: { total?: number; per_class?: Record<string, number> } = await res.json();

        update((prev) =>
            prev.map((x) =>
            x.id === id
                ? {
                    ...x,
                    detecting: false,
                    total: typeof data.total === "number" ? data.total : 0,
                    perClass: data.per_class || {},
                }
                : x
            )
        );
        } catch (e: any) {
        update((prev) =>
            prev.map((x) => (x.id === id ? { ...x, detecting: false, error: e?.message || "detect error" } : x))
        );
        }
    };

    // วิเคราะห์ทั้งหมด (ทำทีละรูป เพื่อลดโหลดเซิร์ฟเวอร์)
    const detectAll = async () => {
        for (const it of items) {
        // ถ้าเคยมีผลแล้วอยากรันซ้ำ ให้ลบเงื่อนไขนี้
        if (typeof it.total === "number") continue;
        // eslint-disable-next-line no-await-in-loop
        await detectOne(it.id);
        }
    };

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 sm:p-5">
      {/* หัว */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-white font-semibold">รูปความเสียหาย</h3>
          <p className="text-xs text-zinc-400">
            เพิ่มได้หลายรูป (เฉพาะภาพ) ขนาดรวมแนะนำ ≤ {maxTotalMB} MB — ตอนนี้ ~ {totalMB.toFixed(1)} MB
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-xl bg-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-600"
          >
            เพิ่มรูป
          </button>
          <button
            type="button"
            onClick={detectAll}
            disabled={items.length === 0 || items.some((x) => x.detecting)}
            className="rounded-xl bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:bg-zinc-600"
          >
            วิเคราะห์ทั้งหมดด้วย AI
          </button>
        </div>
      </div>

      {/* อินพุตไฟล์ (ซ่อนไว้) */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* รายการรูป */}
      {items.length === 0 ? (
        <div className="mt-3 text-sm text-zinc-400">ยังไม่มีรูปความเสียหาย</div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <li key={it.id} className="rounded-xl border border-white/10 bg-zinc-800/60 p-3 flex flex-col gap-3">
              <img src={it.previewUrl} alt="damage" className="w-full h-40 object-cover rounded-lg" />

              {/* ควบคุม/สั่งวิเคราะห์ */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-zinc-300">ด้านของรถ:</label>
                <select
                  value={it.side}
                  onChange={(e) => setSide(it.id, e.target.value as DamageSide)}
                  className="rounded-lg bg-zinc-900 border border-white/10 px-2 py-1 text-sm text-white"
                >
                  <option value="ไม่ระบุ">ไม่ระบุ</option>
                  <option value="ซ้าย">ซ้าย</option>
                  <option value="ขวา">ขวา</option>
                  <option value="หน้า">หน้า</option>
                  <option value="หลัง">หลัง</option>
                </select>

                <button
                  type="button"
                  onClick={() => detectOne(it.id)}
                  disabled={it.detecting}
                  className="ml-auto rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400 disabled:bg-zinc-600"
                >
                  {it.detecting ? "กำลังวิเคราะห์..." : "วิเคราะห์รูปนี้"}
                </button>
                <button
                  type="button"
                  onClick={() => removeOne(it.id)}
                  className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-600"
                >
                  ลบ
                </button>
              </div>

              {/* แสดงผลลัพธ์ */}
              {it.error && <p className="text-xs text-red-400">✖ {it.error}</p>}

              {typeof it.total === "number" ? (
                <div className="rounded-lg bg-zinc-900/70 border border-white/10 p-2 space-y-1.5">
                  <p className="text-xs text-zinc-200">
                    จำนวนความเสียหายทั้งหมด: <span className="font-semibold">{it.total}</span> จุด
                  </p>

                  {it.perClass && Object.keys(it.perClass).length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-300">แยกตามคลาส:</p>
                      <ul className="mt-0.5 text-xs text-zinc-300 list-disc pl-5 space-y-0.5">
                        {Object.entries(it.perClass).map(([label, count]) => (
                          <li key={label}>
                            {label}: {count}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-400">— ยังไม่มีผลการวิเคราะห์ —</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import type { Annotation } from "./ImageViewer";

/* ===== คำศัพท์ EN -> TH (ใช้แปลงค่าเก่าอัตโนมัติ) ===== */
const DAMAGE_EN2TH: Record<string, string> = {
  "crack": "ร้าว",
  "dent": "บุบ",
  "glass shatter": "กระจกแตก",
  "lamp broken": "ไฟแตก",
  "scratch": "ขีดข่วน",
  "tire flat": "ยางแบน",
};
const PART_EN2TH: Record<string, string> = {
  "Back-bumper": "กันชนหลัง",
  "Back-door": "ประตูหลัง",
  "Back-wheel": "ล้อหลัง",
  "Back-window": "หน้าต่างหลัง",
  "Back-windshield": "กระจกบังลมหลัง",
  "Fender": "บังโคลน/แก้มข้าง",
  "Front-bumper": "กันชนหน้า",
  "Front-door": "ประตูหน้า",
  "Front-wheel": "ล้อหน้า",
  "Front-window": "หน้าต่างหน้า",
  "Grille": "กระจังหน้า",
  "Headlight": "ไฟหน้า",
  "Hood": "ฝากระโปรงหน้า",
  "License-plate": "ป้ายทะเบียน",
  "Mirror": "กระจกมองข้าง",
  "Quarter-panel": "แผงบังโคลนหลัง",
  "Rocker-panel": "คิ้ว/สเกิร์ตข้าง",
  "Roof": "หลังคา",
  "Tail-light": "ไฟท้าย",
  "Trunk": "ฝากระโปรงหลัง",
  "Windshield": "กระจกบังลมหน้า",
};
const DAMAGE_THAI = Object.values(DAMAGE_EN2TH);
const PART_THAI = Object.values(PART_EN2TH);
const OTHER = "อื่น ๆ / ระบุเอง";

function toThaiDamage(v?: string) {
  if (!v) return "";
  if (DAMAGE_THAI.includes(v)) return v;
  if (DAMAGE_EN2TH[v]) return DAMAGE_EN2TH[v];
  return OTHER;
}
function toThaiPart(v?: string) {
  if (!v) return "";
  if (PART_THAI.includes(v)) return v;
  if (PART_EN2TH[v]) return PART_EN2TH[v];
  return OTHER;
}

export default function DamageTable({
  boxes,
  onChange,
  onRemove,
  saveCurrentImage,
  onDone,
}: {
  boxes: Annotation[];
  onChange: (b: Annotation) => void;
  onRemove: (id: number) => void;
  saveCurrentImage: () => void;
  onDone: () => void;
}) {
  return (
    <div className="mt-4 rounded-3xl bg-white ring-1 ring-zinc-200 shadow-sm p-4">
      <div className="mb-2 text-sm font-medium text-zinc-700">ตารางความเสียหาย</div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-600">
              <th className="py-2 pr-2">สี</th>
              <th className="py-2 pr-2">ชื่อชิ้นส่วน</th>
              <th className="py-2 pr-2">ความเสียหาย</th>
              <th className="py-2 pr-2">ระดับ</th>
              <th className="py-2 pr-2">พื้นที่ (%)</th>
              <th className="py-2 pr-2">แก้ไข/ลบ</th>
            </tr>
          </thead>
          <tbody>
            {boxes.map((b) => {
              const partSel = toThaiPart(b.part);
              const damageSel = toThaiDamage(b.damage);
              const isCustomPart = partSel === OTHER;
              const isCustomDamage = damageSel === OTHER;

              return (
                <tr key={b.id} className="border-top border-zinc-100">
                  <td className="py-2 pr-2">
                    <span
                      className="inline-block h-4 w-4 rounded ring-1 ring-zinc-300"
                      style={{ backgroundColor: b.color }}
                    />
                  </td>

                  {/* ==== คอลัมน์: ชื่อชิ้นส่วน (select + optional input) ==== */}
                  <td className="py-2 pr-2">
                    <select
                      className="w-full rounded-lg border-zinc-200 bg-white px-2 py-1 ring-1 ring-zinc-200 focus:outline-none"
                      value={partSel || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange({ ...b, part: v === OTHER ? "" : v });
                      }}
                    >
                      <option value="" disabled>เลือกชิ้นส่วน…</option>
                      {PART_THAI.map((th) => (
                        <option key={th} value={th}>{th}</option>
                      ))}
                      <option value={OTHER}>{OTHER}</option>
                    </select>
                    {isCustomPart && (
                      <input
                        className="mt-1 w-full rounded-lg border-zinc-200 bg-white px-2 py-1 ring-1 ring-zinc-200 focus:outline-none"
                        placeholder="ระบุชิ้นส่วน"
                        value={b.part ?? ""}
                        onChange={(e) => onChange({ ...b, part: e.target.value })}
                      />
                    )}
                  </td>

                  {/* ==== คอลัมน์: ความเสียหาย (select + optional input) ==== */}
                  <td className="py-2 pr-2">
                    <select
                      className="w-full rounded-lg border-zinc-200 bg-white px-2 py-1 ring-1 ring-zinc-200 focus:outline-none"
                      value={damageSel || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange({ ...b, damage: v === OTHER ? "" : v });
                      }}
                    >
                      <option value="" disabled>เลือกความเสียหาย…</option>
                      {DAMAGE_THAI.map((th) => (
                        <option key={th} value={th}>{th}</option>
                      ))}
                      <option value={OTHER}>{OTHER}</option>
                    </select>
                    {isCustomDamage && (
                      <input
                        className="mt-1 w-full rounded-lg border-zinc-200 bg-white px-2 py-1 ring-1 ring-zinc-200 focus:outline-none"
                        placeholder="ระบุความเสียหาย"
                        value={b.damage ?? ""}
                        onChange={(e) => onChange({ ...b, damage: e.target.value })}
                      />
                    )}
                  </td>

                  {/* ==== คอลัมน์: ระดับ ==== */}
                  <td className="py-2 pr-2">
                    <select
                      className="rounded-lg bg-white px-2 py-1 ring-1 ring-zinc-200"
                      value={b.severity}
                      onChange={(e) => onChange({ ...b, severity: e.target.value as any })}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </td>

                  {/* ==== คอลัมน์: พื้นที่ ==== */}
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-24 rounded-lg bg-white px-2 py-1 ring-1 ring-zinc-200"
                      value={b.areaPercent ?? 0}
                      onChange={(e) => onChange({ ...b, areaPercent: Number(e.target.value) })}
                    />
                  </td>

                  {/* ==== คอลัมน์: ปุ่ม ==== */}
                  <td className="py-2 pr-2">
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg bg-white px-2 py-1 text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
                        onClick={() => alert("แก้ไขกรอบด้วยการปรับค่าพิกัด (drag/resize จะเพิ่มภายหลัง)")}
                      >
                        แก้ไข
                      </button>
                      <button
                        className="rounded-lg bg-rose-50 px-2 py-1 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                        onClick={() => onRemove(b.id)}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {boxes.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-zinc-500">
                  ยังไม่มีจุดความเสียหาย
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-zinc-500">กด “บันทึก” เพื่อเก็บการแก้ไข</div>
        <div className="flex gap-2">
          <button
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
            onClick={saveCurrentImage}
          >
            บันทึก
          </button>
          <button
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={onDone}
          >
            ดำเนินการต่อ
          </button>
        </div>
      </div>
    </div>
  );
}

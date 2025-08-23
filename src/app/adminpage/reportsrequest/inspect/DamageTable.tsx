"use client";

import type { Annotation } from "./ImageViewer";

export default function DamageTable({
  boxes,
  onChange,
  onRemove,
  onDone,
}: {
  boxes: Annotation[];
  onChange: (b: Annotation) => void;
  onRemove: (id: number) => void;
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
            {boxes.map((b) => (
              <tr key={b.id} className="border-top border-zinc-100">
                <td className="py-2 pr-2">
                  <span
                    className="inline-block h-4 w-4 rounded ring-1 ring-zinc-300"
                    style={{ backgroundColor: b.color }}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="w-full rounded-lg border-zinc-200 bg-white px-2 py-1 ring-1 ring-zinc-200 focus:outline-none"
                    value={b.part}
                    onChange={(e) => onChange({ ...b, part: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="w-full rounded-lg border-zinc-200 bg-white px-2 py-1 ring-1 ring-zinc-200 focus:outline-none"
                    value={b.damage}
                    onChange={(e) => onChange({ ...b, damage: e.target.value })}
                  />
                </td>
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
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-24 rounded-lg bg-white px-2 py-1 ring-1 ring-zinc-200"
                    value={b.areaPercent}
                    onChange={(e) => onChange({ ...b, areaPercent: Number(e.target.value) })}
                  />
                </td>
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
            ))}
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
            onClick={() => alert("บันทึกเรียบร้อย (ตัวอย่าง)")}
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

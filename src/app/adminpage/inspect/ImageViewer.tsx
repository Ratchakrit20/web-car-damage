"use client";

export type Annotation = {
  id: number;
  part: string;
  damage: string;
  severity: "A" | "B" | "C";
  areaPercent: number;
  color: string;
  x: number; y: number; w: number; h: number; // 0..1
};

export default function ImageViewer({
  imageUrl,
  imageLabel,
  boxes,
  onAddBox,
}: {
  imageUrl?: string;
  imageLabel?: string;
  boxes: Annotation[];
  onAddBox: () => void;
}) {
  return (
    <div className="rounded-3xl bg-white ring-1 ring-zinc-200 shadow-sm p-3">
      <div className="mb-2 text-sm font-medium text-zinc-700">
        ภาพ {imageLabel ? `· ${imageLabel}` : ""}
      </div>

      <div className="relative rounded-2xl overflow-hidden ring-1 ring-zinc-200 bg-zinc-50">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full object-contain max-h-[38vh] sm:max-h-[48vh] lg:max-h-[52vh]" />
          ) : (
            <div className="h-[52vh] grid place-items-center text-zinc-400">ไม่มีรูป</div>
          )}

          <div className="absolute inset-0">
            {boxes.map((b, idx) => (
              <div
                key={b.id}
                className="absolute rounded-lg"
                style={{
                  left: `${b.x * 100}%`,
                  top: `${b.y * 100}%`,
                  width: `${b.w * 100}%`,
                  height: `${b.h * 100}%`,
                  boxShadow: `0 0 0 3px ${b.color}`,
                }}
              >
                <div
                  className="absolute -top-3 -left-3 min-w-[28px] rounded-lg px-2 py-1 text-xs font-semibold text-white shadow"
                  style={{ backgroundColor: b.color }}
                >
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          หากระบบตรวจจับไม่ครบ คุณสามารถกด “เพิ่มจุดเสียหาย” แล้วแก้ไขจากตารางด้านล่าง
        </div>
        <button
          onClick={onAddBox}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
        >
          ➕ เพิ่มจุดเสียหาย
        </button>
      </div>
    </div>
  );
}

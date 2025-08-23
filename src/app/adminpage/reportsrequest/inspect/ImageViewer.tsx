"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
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
    const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [lay, setLay] = useState({ dw: 0, dh: 0, left: 0, top: 0 });

  // คำนวณตำแหน่ง/ขนาดรูปที่แสดงจริง (object-contain)
  const recalc = () => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img) return;

    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;

    const scale = Math.min(cw / nw, ch / nh);
    const dw = Math.round(nw * scale);
    const dh = Math.round(nh * scale);
    const left = Math.round((cw - dw) / 2);
    const top = Math.round((ch - dh) / 2);

    setLay({ dw, dh, left, top });
  };

  useLayoutEffect(() => {
    recalc();
    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [imageUrl]);
  return (
    <div className="rounded-3xl bg-white ring-1 ring-zinc-200 shadow-sm p-3">
      <div className="mb-2 text-sm font-medium text-zinc-700">
        ภาพ {imageLabel ? `· ${imageLabel}` : ""}
      </div>

      {/* กรอบคุมภาพแบบ fixed height แต่ยืดหยุ่นกับจอ */}
      <div
        ref={containerRef}
        className="relative  w-full min-h-[260px] sm:min-h-[360px] lg:min-h-[440px]"
      >
        {/* รูปวางกลางกรอบแบบไม่ครอป */}
        {imageUrl && (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={imageLabel ?? ""}
            onLoad={recalc}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                       max-w-full max-h-full object-contain select-none rounded-2xl"
            draggable={false}
          />
        )}

        {/* 👇 overlay ขนาดเท่ารูปจริง และเลื่อนตาม offset ⇒ กรอบไม่ล้นแล้ว */}
        <div
          className="absolute pointer-events-none"
          style={{ left: lay.left, top: lay.top, width: lay.dw, height: lay.dh }}
        >
          {boxes.map((b) => {
            // กันล้น: clamp ค่า 0..1
            const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
            const x = clamp01(b.x), y = clamp01(b.y);
            const w = clamp01(b.w), h = clamp01(b.h);

            return (
              <div
                key={b.id}
                className="absolute rounded-xl border-2"
                style={{
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  width: `${w * 100}%`,
                  height: `${h * 100}%`,
                  borderColor: b.color,
                }}
              >
                {/* หมุดหมายเลข */}
                <div
                  className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center
                             rounded-full text-white text-sm font-semibold shadow"
                  style={{ background: b.color }}
                >
                  {b.id}
                </div>
              </div>
            );
          })}
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

"use client";

type Img = { url: string; side?: string };

export default function ImageList({
  images,
  activeIndex,
  onSelect,
}: {
  images: Img[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="rounded-3xl bg-white ring-1 ring-zinc-200 shadow-sm p-3">
      <div className="mb-2 text-sm font-medium text-zinc-700">รายการรูปภาพ</div>
      <div className="space-y-2 max-h-72 sm:max-h-[60vh] overflow-auto p-1">
        {images.length === 0 && (
          <div className="text-zinc-500 text-sm">ยังไม่มีรูป</div>
        )}
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`w-full flex items-center gap-3 rounded-2xl p-2 ring-1 transition
              ${i === activeIndex ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-zinc-200 hover:bg-zinc-50"}`}
            title={img.side || `ภาพที่ ${i + 1}`}
          >
            <div className="h-12 w-16 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-xs text-zinc-500">ภาพที่ {i + 1}</div>
              <div className="truncate text-sm text-zinc-800">{img.side ?? "ไม่ระบุด้าน"}</div>
            </div>
            <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200">บันทึกแล้ว</div>
          </button>
        ))}
      </div>

    </div>
  );
}

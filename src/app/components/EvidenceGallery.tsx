"use client";

import React, { useEffect, useMemo, useState } from "react";

// ใช้ type เดียวกับที่คุณใช้เก็บ media ใน draft
export type MediaItem = { url: string; type?: "image" | "video"; publicId?: string };

type Props = {
  media: (string | MediaItem)[];
  title?: string;
  thumbWidth?: number;  // ขนาด thumbnail จาก Cloudinary (px)
  className?: string;
};

const asMediaItem = (m: string | MediaItem): MediaItem =>
  typeof m === "string" ? { url: m } : m;

const isVideo = (m: MediaItem) =>
  m.type === "video" || /\.(mp4|mov|webm|ogg)$/i.test(m.url);

/** ทำ thumbnail จาก Cloudinary: แทรก f_auto,q_auto,w_... หลัง /upload/ (เฉพาะรูป) */
const makeThumb = (url: string, w = 800) =>
  url.includes("/upload/")
    ? url.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`)
    : url;

export default function EvidenceGallery({ media, title = "ภาพความเสียหาย", thumbWidth = 800, className = "" }: Props) {
  const items = useMemo(() => (media || []).map(asMediaItem), [media]);

  // modal viewer state
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  // ปิด scroll พื้นหลัง + คีย์ลัด
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (!items.length) return;
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % items.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, items.length]);

  return (
    <section className={className}>
      <h2 className="font-semibold text-center">{title}</h2>

      {/* ✅ Center สำหรับ PC: ใช้ auto-fit + track กว้างคงที่ แล้ว justify-center */}
      <div className="mt-3 grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,280px))] justify-center">
        {items.length ? (
          items.map((m, i) => {
            const thumbUrl = isVideo(m) ? m.url : makeThumb(m.url, thumbWidth);
            return (
              <button
                type="button"
                key={i}
                onClick={() => { setIndex(i); setOpen(true); }}
                className="group relative rounded-xl border bg-black/5 overflow-hidden w-[220px] sm:w-[240px] md:w-[260px] lg:w-[280px]"
                title="คลิกเพื่อดูแบบเต็ม"
              >
                {/* กล่องเนื้อหาแบบ flex เพื่อ ‘จัดกลาง’ ทั้งแนวตั้ง-แนวนอน */}
                <div className="h-36 sm:h-44 md:h-52 lg:h-60 w-full flex items-center justify-center">
                  {isVideo(m) ? (
                    <video
                      src={thumbUrl}
                      muted
                      playsInline
                      className="max-h-full max-w-full block"
                    />
                  ) : (
                    <img
                      src={thumbUrl}
                      alt={`evidence-${i}`}
                      className="max-h-full max-w-full block"
                      loading="lazy"
                      sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, (min-width:640px) 50vw, 100vw"
                    />
                  )}
                </div>
                <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
              </button>
            );
          })
        ) : (
          <div className="col-span-full text-center text-sm text-zinc-500">
            ไม่มีไฟล์แนบ
          </div>
        )}
      </div>

      {/* Modal viewer */}
      {open && items[index] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-6xl w-full max-h-[90vh] rounded-2xl bg-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-xl"
              aria-label="Close"
            >
              ✕
            </button>

            {/* arrows */}
            {items.length > 1 && (
              <>
                <button
                  onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 px-3 py-2 text-white/90 hover:text-white"
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  onClick={() => setIndex((i) => (i + 1) % items.length)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 px-3 py-2 text-white/90 hover:text-white"
                  aria-label="Next"
                >
                  ›
                </button>
              </>
            )}

            {/* content */}
            <div className="flex items-center justify-center p-2">
              {isVideo(items[index]) ? (
                <video
                  src={items[index].url}
                  controls
                  preload="metadata"
                  className="max-h-[80vh] max-w-[90vw] object-contain block mx-auto"
                />
              ) : (
                <img
                  src={items[index].url}
                  alt="evidence"
                  className="max-h-[80vh] max-w-[90vw] object-contain block mx-auto"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 px-2 pb-2">
              <a
                href={items[index].url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-white/10 px-3 py-1 text-white text-sm hover:bg-white/20"
              >
                เปิดในแท็บใหม่
              </a>
              <button onClick={() => setOpen(false)} className="rounded-lg bg-white px-3 py-1 text-sm">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

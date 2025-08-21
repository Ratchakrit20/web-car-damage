"use client";
import React from "react";
import type { ClaimStatus } from "@/types/claim";

const cx = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

export default function FiltersBar({
  query,
  setQuery,
  status,
  setStatus,
  className,
}: {
  query: string;
  setQuery: (v: string) => void;
  status: ClaimStatus | "ทั้งหมด";
  setStatus: (v: ClaimStatus | "ทั้งหมด") => void;
  className?: string;
}) {
  const statuses: Array<ClaimStatus | "ทั้งหมด"> = [
    "ทั้งหมด",
    "กำลังตรวจสอบ",
    "รอข้อมูล",
    "สำเร็จ",
    "ปฏิเสธ",
  ];

  return (
    <div className={cx("flex flex-col gap-3 md:flex-row md:items-center md:justify-between", className)}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ค้นหา: ยี่ห้อ / รุ่น / ทะเบียน / ประเภทเหตุการณ์"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none md:max-w-md"
      />
      <div className="flex flex-wrap items-center gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cx(
              "rounded-full px-3 py-1 text-xs font-medium",
              status === s ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

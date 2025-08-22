import React from "react";
import type { ClaimItem, ClaimStatus } from "@/types/claim";

const statusChip: Record<ClaimStatus, string> = {
  "กำลังตรวจสอบ": "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
  "สำเร็จ": "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300",
  "ปฏิเสธ": "bg-rose-100 text-rose-800 ring-1 ring-rose-300",
};

function thDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ReportCard({
  data,
  active,
  layout = "wide",
  onClick,
  onOpenPdf,
  onDetail,
}: {
  data: ClaimItem;
  active?: boolean;
  layout?: "wide";
  onClick?: () => void;
  onOpenPdf?: () => void;
  onDetail?: () => void;
}) {
  const damageText = Array.isArray(data.damageAreas)
    ? data.damageAreas.join(", ")
    : data.damageAreas || "-";

  return (
    <div
      onClick={onClick}
      className={[
        "group grid cursor-pointer gap-4 rounded-2xl border p-3 sm:p-4 transition",
        active
          ? "border-emerald-400 bg-emerald-50"
          : "border-zinc-200 bg-white hover:bg-zinc-50",
        layout === "wide" ? "grid-cols-[160px_1fr]" : "",
      ].join(" ")}
    >
      {/* รูป */}
      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-100">
        {data.photoUrl ? (
          <img
            src={data.photoUrl}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            ไม่มีรูป
          </div>
        )}
      </div>

      {/* ข้อมูลด้านขวา */}
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-900">
            {data.carTitle}
          </h3>
          <span
            className={[
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
              statusChip[data.status],
            ].join(" ")}
          >
            {data.status}
          </span>
        </div>

        <div className="mt-1 grid gap-1 text-sm text-zinc-800">
          <div>
            <span className="text-zinc-600">วันที่แจ้งเคลม: </span>
            {thDate(data.incidentDate)}
          </div>
          {data.incidentType && (
            <div>
              <span className="text-zinc-600">ประเภทเหตุการณ์: </span>
              {data.incidentType}
            </div>
          )}
          {damageText && (
            <div>
              <span className="text-zinc-600">ตำแหน่งความเสียหาย: </span>
              {damageText}
            </div>
          )}
          {data.severitySummary && (
            <div>
              <span className="text-zinc-600">สรุปความเสียหาย: </span>
              {data.severitySummary}
            </div>
          )}
        </div>

        {/* ปุ่ม */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenPdf?.();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-3.5 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            <span aria-hidden>📄</span> ดูรายงาน PDF
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetail?.();
            }}
            className="rounded-xl bg-indigo-100 px-3.5 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-200"
          >
            รายละเอียดขั้นตอน
          </button>
        </div>
      </div>
    </div>
  );
}

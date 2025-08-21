"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReportCard from "./ReportCard";
import type { ClaimItem } from "@/types/claim";

const cx = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

function thDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ReportsView({
  claims,
  onOpenPdf,
}: {
  claims: ClaimItem[];
  onOpenPdf: (id: string) => void;
}) {
  // default เลือกเคสที่ใหม่สุด
  const defaultSelected =
    [...claims].sort(
      (a, b) => +new Date(b.incidentDate) - +new Date(a.incidentDate)
    )[0]?.id ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);
  useEffect(() => setSelectedId(defaultSelected), [defaultSelected]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ทั้งหมด" | "กำลังตรวจสอบ" | "สำเร็จ" | "ปฏิเสธ" | "รอข้อมูล"
  >("ทั้งหมด");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return claims.filter((c) => {
      const matchText =
        !q ||
        c.carTitle?.toLowerCase().includes(q) ||
        c.incidentType?.toLowerCase().includes(q) ||
        c.damageAreas?.toString().toLowerCase().includes(q) ||
        c.severitySummary?.toLowerCase().includes(q) ||
        thDateTime(c.incidentDate).includes(q);
      const matchStatus = statusFilter === "ทั้งหมด" || c.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [claims, query, statusFilter]);

  const selected = useMemo(
    () => claims.find((c) => c.id === selectedId) ?? null,
    [claims, selectedId]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* ซ้าย: แสดงตัวล่าสุด/ที่เลือกแบบการ์ดใหญ่เดียว */}
        <section className="lg:sticky lg:top-24 self-start">
          {selected ? (
            <ReportCard
              data={selected}
              layout="wide"
              active
              onOpenPdf={() => onOpenPdf(selected.id)}
              onClick={() => {}}
              onDetail={() => (window.location.href = `/reports/${selected.id}`)}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-black/70">
              เลือกรายการจากด้านขวาเพื่อแสดงรายละเอียด
            </div>
          )}
        </section>

        {/* ขวา: แถบค้นหา + รายการแบบ “แถวกว้าง” ตามภาพตัวอย่าง */}
        <section className="lg:h-[calc(100vh-10rem)] lg:overflow-y-auto">
          <div className="rounded-2xl bg-white p-4 md:p-5 ring-1 ring-zinc-200/70 shadow-sm">
            {/* Search + Filter */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">🔎</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ค้นหา: ชื่อรถ/ทะเบียน, วันที่, ประเภทเหตุการณ์, ตำแหน่งเสียหาย…"
                    className="w-full rounded-xl bg-white px-10 py-2.5 text-zinc-800 placeholder-zinc-400
                              ring-1 ring-zinc-200 focus:ring-2 focus:ring-emerald-400 shadow-sm outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["ทั้งหมด", "กำลังตรวจสอบ", "สำเร็จ", "ปฏิเสธ", "รอข้อมูล"] as const).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cx(
                        "rounded-full px-3 py-1.5 text-sm transition",
                        s === statusFilter
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300"
                          : "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
                      )}
                    >
                      {s}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* รายการ: ใช้แบบ list 1 คอลัมน์ เพื่อโชว์รายละเอียดครบตามตัวอย่าง */}
            <div className="mt-4 flex flex-col gap-4">
              {filtered.map((item) => (
                <ReportCard
                  key={item.id}
                  data={item}
                  layout="wide"
                  active={item.id === selectedId}
                  onClick={() => setSelectedId(item.id)}
                  onOpenPdf={() => onOpenPdf(item.id)}
                  onDetail={() => (window.location.href = `/reports/${item.id}`)}
                />
              ))}

              {filtered.length === 0 && (
                <div className="py-14 text-center text-sm text-white/60">
                  ไม่พบรายการที่ตรงกับการค้นหา
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

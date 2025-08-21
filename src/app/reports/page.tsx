"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReportsView from "./ReportsView";
import PdfRequest from "@/app/reports/PdfRequest"; // เดิมของคุณ
import type { ClaimItem, ClaimReportRow, ClaimStatus, Car, AccidentDraft, User } from "@/types/claim";

const URL_PREFIX =
  process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");

async function fetchAuth() {
  const res = await fetch(`${URL_PREFIX}/api/me`, { credentials: "include" });
  if (!res.ok) throw new Error("auth failed");
  return res.json() as Promise<{ user: User | null; isAuthenticated: boolean }>;
}

async function fetchClaimsByUser(userId: number): Promise<ClaimItem[]> {
  const url = `${URL_PREFIX}/api/claim-requests/list?user_id=${encodeURIComponent(String(userId))}`;
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
  const json = await res.json();
  const rows: ClaimReportRow[] = json?.data ?? [];
  return rows.map((r) => ({
    id: String(r.claim_id ?? r.report_id ?? r.accident_detail_id),
    carTitle:
      r.car_title ??
      `${r.car_brand ?? "รถ"} ${r.car_model ?? ""}  ทะเบียน ${r.license_plate ?? "-"}`,
    incidentDate: r.accident_date ?? r.created_at ?? new Date().toISOString(),
    incidentType: r.accident_type ?? undefined,
    damageAreas: (r as any).damage_areas ?? undefined,
    severitySummary: (r as any).severity_summary ?? undefined,
    status: ((r.status as ClaimStatus) ?? "กำลังตรวจสอบ") as ClaimStatus,
    photoUrl:
      r.thumbnail_url ??
      r.first_image_url ??
      (Array.isArray(r.images) ? r.images[0]?.original_url ?? undefined : undefined),
  }));
}

type PdfDetail = {
  claim_id: number | string;
  status?: string;
  created_at?: string;
  car: Car | null;
  accident: AccidentDraft;
};

async function fetchClaimDetail(claimId: string | number): Promise<PdfDetail> {
  const url = `${URL_PREFIX}/api/claim-requests/detail?claim_id=${encodeURIComponent(String(claimId))}`;
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.message || "โหลดรายละเอียดไม่สำเร็จ");
  return {
    claim_id: json.data.claim_id,
    status: json.data.status,
    created_at: json.data.created_at,
    car: json.data.car ?? null,
    accident: json.data.accident as AccidentDraft,
  };
}

export default function ReportPage() {
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF modal
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDetail, setPdfDetail] = useState<PdfDetail | null>(null);

  // auth
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAuth();
        if (cancelled) return;
        setUser(data.user ?? null);
        setIsAuthenticated(Boolean(data.isAuthenticated));
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) router.replace("/login");
  }, [isAuthenticated, router]);

  // fetch claims
  useEffect(() => {
    if (isAuthenticated !== true || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchClaimsByUser(Number(user.id));
        if (!cancelled) setClaims(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Load error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  const handleOpenPdf = async (claimId: string) => {
    try {
      setPdfLoading(true);
      const detail = await fetchClaimDetail(claimId);
      setPdfDetail(detail);
      setPdfOpen(true);
    } catch (e: any) {
      alert(e?.message ?? "โหลดเอกสารไม่สำเร็จ");
    } finally {
      setPdfLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-zinc-200">กำลังตรวจสอบสิทธิ์…</div>;
  }
  if (isAuthenticated === false) return null;

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-zinc-200">กำลังโหลดข้อมูล…</div>;
  }
  if (error) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-rose-300">เกิดข้อผิดพลาด: {error}</div>;
  }

  return (
    <div className="
      min-h-screen bg-gradient-to-b from-[#F1F5FF] via-[#F7FAFF] to-white
      lg:h-screen lg:overflow-hidden
    ">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 lg:py-8">

        {/* Page Header */}
        <header className="mb-4 lg:mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300">
                🧾
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-wide text-zinc-900 sm:text-2xl">
                  รายการขอเคลมทั้งหมด
                </h1>
                <p className="mt-1 text-sm text-zinc-600">
                  ดูสถานะการเคลมทั้งหมดของคุณแบบเรียลไทม์ พร้อมเปิดรายงาน PDF ได้ทันที
                </p>
              </div>
            </div>

            {/* Summary badge */}
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200 shadow-sm">
                ทั้งหมด {claims.length} รายการ
              </span>
            </div>
          </div>

          <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
        </header>

        {/* Content */}
        <ReportsView claims={claims} onOpenPdf={handleOpenPdf} />
      </div>

      {/* Modal PDF */}
      {pdfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-zinc-200/70 bg-white/90 px-4 py-3 backdrop-blur">
              <div className="text-sm font-medium text-zinc-700">เอกสารรายงานเคลม</div>
              <button
                onClick={() => setPdfOpen(false)}
                className="rounded-lg bg-zinc-900/5 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-900/10"
              >
                ปิด
              </button>
            </div>
            <div className="px-4 pb-6 pt-2">
              {pdfLoading || !pdfDetail ? (
                <div className="p-6 text-zinc-600">กำลังเตรียมเอกสาร…</div>
              ) : (
                <PdfRequest detail={pdfDetail} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

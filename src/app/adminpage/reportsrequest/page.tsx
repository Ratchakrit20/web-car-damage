// src/app/reportsrequest/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ClaimItem,
  ClaimReportRow,
  ClaimStatus,
  Car,
  AccidentDraft,
  User,
} from "@/types/claim";
import PdfRequest from "@/app/reports/PdfRequest";

// ---------- Config ----------
const URL_PREFIX =
  process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");

// ---------- Types ----------
type ApiAuth = { user: User | null; isAuthenticated: boolean };
type PdfDetail = {
  claim_id: number | string;
  status?: string;
  created_at?: string;
  car: Car | null;
  accident: AccidentDraft;
};

// ---------- Helpers ----------
const thDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// map/normalize สถานะจาก backend -> ไทยที่ใช้ใน UI
function normalizeStatus(s?: string | null): ClaimStatus {
  const x = (s || "").toLowerCase();
  if (x === "pending" || x === "ตรวจสอบ" || x === "review") return "กำลังตรวจสอบ";
  if (x === "approved" || x === "success" || x === "done") return "สำเร็จ";
  if (x === "rejected" || x === "deny") return "ปฏิเสธ";
  return "กำลังตรวจสอบ";
}

// ---------- API ----------
async function fetchAuth(): Promise<ApiAuth> {
  const res = await fetch(`${URL_PREFIX}/api/me`, { credentials: "include" });
  if (!res.ok) throw new Error("auth failed");
  return res.json();
}

async function fetchClaimsByUser(userId: number): Promise<ClaimItem[]> {
  const url = `${URL_PREFIX}/api/claim-requests/listall`;
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
  const json = await res.json();
  const rows: ClaimReportRow[] = json?.data ?? [];

  return rows.map((r) => {
    const status = normalizeStatus((r as any).status);
    return {
      id: String((r as any).claim_id ?? (r as any).report_id ?? (r as any).accident_detail_id),
      carTitle:
        (r as any).car_title ??
        `${(r as any).car_brand ?? "รถ"} ${(r as any).car_model ?? ""}  ทะเบียน ${(r as any).license_plate ?? "-"}`,
      incidentDate: (r as any).accident_date ?? (r as any).created_at ?? new Date().toISOString(),
      incidentType: (r as any).accident_type ?? undefined,
      damageAreas: (r as any).damage_areas ?? undefined,
      severitySummary: (r as any).severity_summary ?? undefined,
      status, // <-- แบบไทย
      photoUrl:
        (r as any).thumbnail_url ??
        (r as any).first_image_url ??
        (Array.isArray((r as any).images) ? (r as any).images[0]?.original_url ?? undefined : undefined),
    } as ClaimItem;
  });
}

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

// ---------- Small UI pieces ----------
function StatusChip({ status }: { status: ClaimStatus }) {
  const map: Record<ClaimStatus, string> = {
    กำลังตรวจสอบ: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    สำเร็จ: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    ปฏิเสธ: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

function RequestCard({
  item,
  onOpenPdf,
}: {
  item: ClaimItem;
  onOpenPdf: (id: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-emerald-300 bg-emerald-50/50 p-4 shadow-sm transition hover:shadow-md">
      <div className="flex gap-4">
        {/* รูป */}
        <div className="h-28 w-40 shrink-0 overflow-hidden rounded-xl ring-1 ring-emerald-200 bg-white">
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt={item.carTitle} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400">ไม่มีรูป</div>
          )}
        </div>

        {/* เนื้อหา */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-lg font-semibold text-zinc-900">{item.carTitle}</h3>
            <StatusChip status={item.status} />
          </div>

          <dl className="mt-1 grid grid-cols-2 gap-y-1 text-sm text-zinc-700 sm:grid-cols-3">
            <div className="truncate">
              <dt className="inline text-zinc-500">วันที่แจ้งเคลม: </dt>
              <dd className="inline">{thDate(item.incidentDate)}</dd>
            </div>
            <div className="truncate">
              <dt className="inline text-zinc-500">ประเภทเหตุการณ์: </dt>
              <dd className="inline">{item.incidentType ?? "-"}</dd>
            </div>
            <div className="truncate">
              <dt className="inline text-zinc-500">ตำแหน่งความเสียหาย: </dt>
              <dd className="inline">{item.severitySummary ?? "-"}</dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onOpenPdf(item.id)}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              📄 ดูรายงาน PDF
            </button>
            <Link
              href={`/adminpage/inspect?claim_id=${item.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              ตรวจสอบความเสียหาย
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Page ----------
export default function ReportsRequestPage() {
  const router = useRouter();

  // auth
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // data
  const [allClaims, setAllClaims] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // pdf modal
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDetail, setPdfDetail] = useState<PdfDetail | null>(null);

  // โหลดสิทธิ์
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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) router.replace("/login");
  }, [isAuthenticated, router]);

  // โหลดรายการทั้งหมด → ค่อยกรองใน memo
  useEffect(() => {
    if (isAuthenticated !== true || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchClaimsByUser(Number(user.id));
        if (!cancelled) setAllClaims(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Load error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  // กรองเฉพาะ "กำลังตรวจสอบ"
  const pendingClaims = useMemo(
    () => allClaims.filter((c) => normalizeStatus(c.status) === "กำลังตรวจสอบ"),
    [allClaims]
  );

  // เปิด PDF
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

  // -------- states --------
  if (isAuthenticated === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-zinc-500">กำลังตรวจสอบสิทธิ์…</div>
    );
  }
  if (isAuthenticated === false) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F1F5FF] via-[#F7FAFF] to-white">
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
          <Header count={0} />
          <SkeletonList />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-rose-500">
        เกิดข้อผิดพลาด: {error}
      </div>
    );
  }

  // -------- render --------
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F1F5FF] via-[#F7FAFF] to-white">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 lg:py-8">
        <Header count={pendingClaims.length} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
          {pendingClaims.length === 0 ? (
            <EmptyState />
          ) : (
            pendingClaims.map((item) => (
              <RequestCard key={item.id} item={item} onOpenPdf={handleOpenPdf} />
            ))
          )}
        </div>
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

// ---------- Sub-components ----------
function Header({ count }: { count: number }) {
  return (
    <>
      <header className="mb-4 lg:mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-300">
              🕵️‍♀️
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-wide text-zinc-900 sm:text-2xl">
                เคลมที่กำลังตรวจสอบ
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                ดูรายการที่อยู่ระหว่างการตรวจสอบแบบเรียลไทม์ พร้อมเปิดเอกสาร PDF ได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200 shadow-sm">
              ทั้งหมด {count} รายการ
            </span>
          </div>
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
      </header>
    </>
  );
}

function SkeletonList() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-3xl border border-zinc-200 bg-white/60 p-4"
        >
          <div className="flex gap-4">
            <div className="h-28 w-40 rounded-xl bg-zinc-200" />
            <div className="flex-1">
              <div className="h-5 w-2/3 rounded bg-zinc-200" />
              <div className="mt-2 h-4 w-1/2 rounded bg-zinc-200" />
              <div className="mt-2 h-4 w-1/3 rounded bg-zinc-200" />
              <div className="mt-4 h-8 w-40 rounded-full bg-zinc-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full">
      <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">
        ยังไม่มีรายการที่กำลังตรวจสอบ
      </div>
    </div>
  );
}

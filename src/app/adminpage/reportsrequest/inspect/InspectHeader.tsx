"use client";

export default function InspectHeader(props: {
  claimId: string;
  title: string;
  accidentType: string;
  accidentDate: string;
}) {
  const { claimId, title, accidentType, accidentDate } = props;
  return (
    <header className="mb-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-300">
          🛠️
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-wide text-zinc-900 sm:text-2xl">
            ตรวจสอบความเสียหาย
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            เลขเคลม {claimId} · {title} · ประเภทเหตุการณ์: {accidentType} · วันที่: {accidentDate}
          </p>
        </div>
      </div>
      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
    </header>
  );
}

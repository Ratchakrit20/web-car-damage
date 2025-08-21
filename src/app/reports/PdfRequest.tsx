"use client"; // แค่เพื่อให้ปุ่ม print ใช้ window.print ได้—ไม่มีการ fetch

import React from "react";
import EvidenceGallery from "../components/EvidenceGallery";
import type { Car, AccidentDraft } from "@/types/claim";

export type PdfDetail = {
  claim_id: string | number;
  status?: string;
  created_at?: string;
  car: Car | null;
  accident: AccidentDraft;
};

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <div className="text-zinc-500">{k}</div>
      <div className="font-medium text-right">{v}</div>
    </div>
  );
}

export default function PdfRequest({ detail }: { detail: PdfDetail }) {
  const { car, accident } = detail;

  const evidenceList = Array.isArray(accident?.evidenceMedia) ? accident.evidenceMedia : [];
  const damageList = Array.isArray(accident?.damagePhotos) ? accident.damagePhotos : [];

  return (
    <div className="mx-auto max-w-3xl bg-white text-zinc-900 rounded-2xl p-6 shadow-lg print:shadow-none print:max-w-none print:rounded-none">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-center">รายงานการเคลม</h1>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm hover:bg-indigo-500"
        >
          พิมพ์ / บันทึก PDF
        </button>
      </div>

      {/* รายละเอียดรถ */}
      {car && (
        <section className="mt-6">
          <h2 className="font-semibold text-center">รายละเอียดรถ</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Row k="ยี่ห้อ - รุ่น" v={`${car.car_brand} ${car.car_model}`} />
            <Row k="ทะเบียน" v={car.car_license_plate} />
            <Row k="ประเภทประกัน" v={car.insurance_type} />
            <Row k="เลขที่กรมธรรม์" v={car.policy_number} />
            <Row k="ปีผลิต" v={String(car.car_year)} />
            <Row k="วันหมดอายุ" v={new Date(car.coverage_end_date).toLocaleDateString("th-TH")} />
          </div>
          <hr className="my-4" />
        </section>
      )}

      {/* รายละเอียดอุบัติเหตุ */}
      <section>
        <h2 className="font-semibold text-center">รายละเอียดอุบัติเหตุ</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <Row k="วันที่/เวลา" v={`${accident.date}  เวลา: ${accident.time}`} />
          <Row k="ประเภท" v={accident.accidentType} />
          <Row k="จังหวัด/อำเภอ" v={`${accident.province ?? "-"} / ${accident.district ?? "-"}`} />
          <Row k="ประเภทพื้นที่" v={accident.areaType} />
          <Row k="ถนน" v={accident.road || "-"} />
          <Row k="จุดสังเกต" v={accident.nearby || "-"} />
          <Row k="พิกัด" v={`Lat ${accident.location.lat}, Lng ${accident.location.lng}`} />
        </div>
        {accident.details && (
          <div className="mt-3 text-sm">
            <div className="font-medium">รายละเอียดเพิ่มเติม</div>
            <div className="whitespace-pre-wrap">{accident.details}</div>
          </div>
        )}
        <hr className="my-4" />
      </section>

      {/* รูปหลักฐาน */}
      {evidenceList.length > 0 && (
        <section>
          <EvidenceGallery media={evidenceList} title="รูปหลักฐาน" thumbWidth={800} />
        </section>
      )}

      {/* รูปความเสียหาย */}
      {damageList.length > 0 && (
        <section className="mt-6">
          <EvidenceGallery media={damageList} title="รูปความเสียหาย" thumbWidth={800} />
        </section>
      )}
    </div>
  );
}

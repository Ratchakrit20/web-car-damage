export type User = {
    id: string;
    email: string;
    name: string;
    citizen_id: string;
    phone_number: string;
    address: string;
    role: string;
}


// Centralized types for Claim/Accident across pages
// --------------------------------------------------
export type ClaimStatus = "กำลังตรวจสอบ" | "สำเร็จ" | "ปฏิเสธ" ;

export type MediaItem = {
  id: number;
  url: string;
  type?: "image" | "video";
  publicId?: string;
};

export type DamagePhoto = MediaItem & {
  side?: "ซ้าย" | "ขวา" | "หน้า" | "หลัง" | "ไม่ระบุ";
  // optional metadata from detection pipelines (not required on UIs)
  total?: number | null;
  perClass?: Record<string, number> | null;
};

export type Car = {
  id: number;
  car_brand: string;
  car_model: string;
  car_year: string | number;
  car_license_plate: string;
  insurance_type: string;
  policy_number: string;
  coverage_end_date: string; // ISO date
};

export type AccidentDraft = {
  accidentType: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm or HH:mm:ss
  province: string | null;
  district: string | null;
  road?: string | null;
  areaType: string;
  nearby?: string | null;
  details?: string | null;
  location: { lat: number; lng: number; accuracy?: number | null };
  evidenceMedia?: MediaItem[]; // general evidence (no side)
  damagePhotos?: DamagePhoto[]; // damage photos (may include side)
};

// Minimal UI model used by lists/cards in ReportPage
export interface ClaimItem {
  id: string; // claim_id/report_id/accident_detail_id as string
  carTitle: string;
  incidentDate: string; // ISO
  incidentType?: string;
  damageAreas?: string;
  severitySummary?: string;
  status: ClaimStatus;
  photoUrl?: string;
  pdfUrl?: string; // link to a printable review page if any
}

// Shape coming back from /api/claimreport/list (server row). Keep optional to be tolerant to schema changes.
export interface ClaimReportRow {
  report_id?: number;
  claim_id?: number;
  accident_detail_id?: number;
  user_id?: number;
  status?: ClaimStatus | string;
  created_at?: string;

  // accident_details
  accident_type?: string;
  accident_date?: string;
  accident_time?: string;
  area_type?: string;
  province?: string | null;
  district?: string | null;
  road?: string | null;
  nearby?: string | null;
  details?: string | null;
  thumbnail_url?: string | null;
  media_type?: string | null;

  // cars (optional join)
  car_brand?: string | null;
  car_model?: string | null;
  car_year?: string | number | null;
  license_plate?: string | null;

  // images aggregated as JSON array
  images?: Array<{
    id: number;
    original_url: string | null;
    evaluated_url: string | null;
    side: string | null;
  }>;

  // optional fields commonly used by UI
  car_title?: string | null;
  first_image_url?: string | null;
  pdf_url?: string | null;
  damage_areas?: string | null;
  severity_summary?: string | null;
}

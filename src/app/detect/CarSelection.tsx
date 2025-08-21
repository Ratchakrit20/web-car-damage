'use client';

import React, { useEffect, useMemo, useState } from 'react';
import SafeAreaSpacer from '../components/SafeAreaSpacer';

interface CarSelectionProps {
  onNext: () => void;
  citizenId: string | undefined;
  userId?: number;
}

type CarItem = {
  id: number;
  car_path: string;
  car_brand: string;
  car_model: string;
  car_year: string | number;
  car_license_plate: string;
  policy_number: string;
  insurance_company: string;
  insurance_type: string;
  coverage_end_date: string;
};

const STORAGE_KEY = 'claimSelectedCar';

// โทนสีหลักของธีม
const THEME = {
  primary: '#635BFF',
  card: '#1E1E2F',
  cardHover: '#232336',
  surface: '#292734',
  surfaceHover: '#2f2c3b',
  textMuted: 'text-zinc-400',
};

export default function CarSelection({ onNext, citizenId }: CarSelectionProps) {
  const [cars, setCars] = useState<CarItem[]>([]);
  const [selectedCarIndex, setSelectedCarIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const API_PREFIX = useMemo(
    () => process.env.NEXT_PUBLIC_URL_PREFIX?.replace(/\/$/, '') || '',
    []
  );

  useEffect(() => {
    const fetchPolicies = async () => {
      if (!citizenId) {
        setLoading(false);
        setFetchError('ไม่พบ citizenId ของผู้ใช้');
        return;
      }
      try {
        setLoading(true);
        setFetchError(null);

        const res = await fetch(`${API_PREFIX}/api/policy/${citizenId}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`โหลดข้อมูลรถไม่สำเร็จ (HTTP ${res.status})`);
        const data = (await res.json()) as CarItem[];
        setCars(data || []);

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const prev: CarItem = JSON.parse(saved);
          const idx = (data || []).findIndex((c) => c.id === prev.id);
          setSelectedCarIndex(idx >= 0 ? idx : data?.length ? 0 : null);
        } else {
          setSelectedCarIndex(data?.length ? 0 : null);
        }
      } catch (err: any) {
        console.error(err);
        setFetchError(err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลรถ');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, [API_PREFIX, citizenId]);

  const selectedCar =
    selectedCarIndex !== null && selectedCarIndex >= 0 ? cars[selectedCarIndex] : undefined;

  const handleNext = () => {
    if (!selectedCar) {
      alert('กรุณาเลือกรถก่อน');
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCar));
    onNext();
  };

  /* ---------- UI ---------- */

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 md:px-6">
        <h2 className="text-center text-xl sm:text-2xl font-semibold mb-6 sm:mb-8">
          เลือกรถที่ต้องการดำเนินการ
        </h2>
        {/* Skeleton โหลดรายการ */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-[280px] rounded-2xl p-4 bg-[#232336] ring-1 ring-white/5 shadow-sm"
            >
              <div className="h-36 w-full rounded-xl bg-white/5 animate-pulse" />
              <div className="h-4 w-40 mt-4 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-24 mt-2 rounded bg-white/10 animate-pulse" />
              <div className="h-7 w-28 mt-4 rounded-full bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="md:hidden -mx-3 px-3 py-2">
          <div className="h-44 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="text-center py-12">
        <div className="text-rose-300 mb-4">{fetchError}</div>
        <button
          onClick={() => location.reload()}
          className="bg-[#635BFF] hover:bg-[#7b72ff] text-white px-4 py-2 rounded-lg"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  if (!cars.length) {
    return (
      <div className="text-center py-12">
        <div className="text-zinc-300 mb-2">ไม่มีข้อมูลรถสำหรับเลขบัตรนี้</div>
        <div className="text-zinc-400 text-sm">กรุณาตรวจสอบเลขบัตรประชาชน หรือเพิ่มรถเข้าระบบ</div>
      </div>
    );
  }

  return (
  <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 md:px-6">
    <h2 className="text-lg sm:text-xl font-semibold mb-4 text-center">
      เลือกรถที่ต้องการดำเนินการ
    </h2>

    {/* แสดงเป็น flex wrap บนมือถือ */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
      {cars.map((car, index) => {
        const active = index === selectedCarIndex;
        return (
          <button
            key={car.id}
            type="button"
            onClick={() => setSelectedCarIndex(index)}
            className={[
              'w-full rounded-2xl p-4 text-left transition-all duration-200 shadow-sm',
              active
                ? 'bg-violet-500/10 ring-2 ring-violet-500'
                : 'bg-white hover:bg-zinc-50 ring-1 ring-zinc-200',
            ].join(' ')}
          >
            <img
              src={car.car_path?.startsWith('http') ? car.car_path : `/${car.car_path}`}
              alt={`${car.car_brand} ${car.car_model}`}
              className="w-full h-36 object-cover rounded-xl mb-3"
            />
            <div className="font-semibold text-zinc-800">
              {car.car_brand} {car.car_model}
            </div>
            <div className="text-sm text-zinc-500">ปี {car.car_year}</div>
            <span className="mt-2 inline-block rounded-full bg-violet-600 px-3 py-1 text-white text-sm">
              {car.car_license_plate}
            </span>
          </button>
        );
      })}
    </div>

    {/* รายละเอียดรถที่เลือก */}
    {selectedCar && (
      <div className="rounded-2xl bg-white ring-1 ring-zinc-200 shadow-sm p-5 mb-6 max-w-lg mx-auto">
        <h3 className="text-base font-semibold mb-3">รายละเอียดรถที่เลือก</h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <Info label="ยี่ห้อ" value={selectedCar.car_brand} />
          <Info label="รุ่น" value={selectedCar.car_model} />
          <Info label="ปีที่ผลิต" value={selectedCar.car_year} />
          <Info label="ทะเบียน" value={selectedCar.car_license_plate} />
          <Info label="เลขกรมธรรม์" value={selectedCar.policy_number} />
          <Info label="บริษัทประกัน" value={selectedCar.insurance_company} />
          <Info label="ประเภทประกัน" value={selectedCar.insurance_type} />
          <Info
            label="หมดอายุ"
            value={new Date(selectedCar.coverage_end_date).toLocaleDateString('th-TH')}
          />
        </div>
      </div>
    )}

    {/* ปุ่มดำเนินการต่อ */}
    <div className="px-2 flex justify-end">
      <button
        onClick={handleNext}
        disabled={selectedCarIndex === null}
        className="w-full sm:w-auto rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 font-medium shadow-sm disabled:opacity-50"
      >
        ดำเนินการต่อ
      </button>
    </div>

    <SafeAreaSpacer />
  </div>
);

}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-zinc-400">{label}</div>
      <div className="font-medium break-all text-black">{value ?? '-'}</div>
    </div>
  );
}

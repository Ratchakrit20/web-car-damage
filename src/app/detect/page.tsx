'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ฟอนต์ธีม (เลือกใช้เฉพาะเพจนี้ได้เลย หรือย้ายไป layout ก็ได้)
import { Prompt, Noto_Sans_Thai } from 'next/font/google';
const headingFont = Prompt({ subsets: ['thai', 'latin'], weight: ['600', '700'], display: 'swap' });
const bodyFont = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500'], display: 'swap' });

import CarSelection from './CarSelection';
import AccidentDetails from './AccidentDetails';
import ReviewConfirm from './ReviewConfirm';

interface User {
  id: string;
  email: string;
  name: string;
  citizen_id: string;
  phone_number: string;
  address: string;
  role: string;
}

const STEPS = [
  { label: 'เลือกรถ', icon: '🚗' },
  { label: 'รายละเอียดอุบัติเหตุ', icon: '📝' },
  { label: 'อัปโหลดภาพ', icon: '🖼️' },
  { label: 'ยืนยัน', icon: '✅' },
];

export default function DetectPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // -------- Auth --------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/me`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (cancelled) return;
        console.log('Auth data:', data.user);
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
    if (isAuthenticated === false) router.replace('/login');
  }, [isAuthenticated, router]);

  if (isAuthenticated === null) {
    return (
      <div
        className={`${bodyFont.className} grid min-h-screen place-items-center bg-gradient-to-b from-[#F1F5FF] via-[#F7FAFF] to-white`}
      >
        <div className="rounded-2xl bg-white px-4 py-3 text-zinc-700 ring-1 ring-zinc-200 shadow-sm">
          กำลังตรวจสอบสิทธิ์…
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  // -------- Steps --------
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <CarSelection
            onNext={() => setStep(1)}
            citizenId={user?.citizen_id}
            userId={user ? Number(user.id) : undefined}
          />
        );
      case 1:
        return <AccidentDetails onNext={() => setStep(2)} onBack={() => setStep(0)} />;
      case 2:
        return (
          <ReviewConfirm
            onBack={() => setStep(1)}
            onFinish={() => router.push('/')}
            userId={user ? Number(user.id) : undefined}
          />
        );
      default:
        return <div className="text-zinc-700">ไม่พบขั้นตอน</div>;
    }
  };

  return (
    <div className={`${bodyFont.className} relative w-full overflow-x-hidden`}>
      {/* BG: ปูเต็มทุกอุปกรณ์ */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#F9FAFB] via-[#F1F5FF] to-[#EEF2FF]" />

      {/* ใช้ 100dvh/100svh ให้เต็มหน้าจอมือถือจริง ๆ */}
      <div className="min-h-[100dvh] sm:min-h-[100svh] w-full">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6 py-4 lg:py-8">
          {/* Header */}
          <header className="mb-4 lg:mb-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300">
                🧭
              </div>
              <div>
                <h1
                  className={`${headingFont.className} text-lg sm:text-2xl font-semibold tracking-wide text-zinc-900`}
                >
                  ตรวจสอบความเสียหายจากภาพ
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-zinc-600">
                  ทำทีละขั้นตอน: เลือกรถ อธิบายเหตุการณ์ อัปโหลดภาพ และยืนยันข้อมูล
                </p>
              </div>
            </div>
          </header>

          {/* Progress + Content */}
          <div className="grid gap-3 sm:gap-4">
            <ProgressBar current={step} />

            {/* การ์ดเนื้อหา – ไม่ fix ความสูง */}
            <section
              className="rounded-2xl bg-white ring-1 ring-zinc-200 shadow-sm
                        p-3 sm:p-5 md:p-6
                        box-border max-w-full overflow-x-hidden break-words"
            >
              {/* สำคัญ: ให้ลูกหลานหดตามกรอบ ไม่ดันล้น */}
              <div className="min-w-0">
                {renderStep()}
              </div>
            </section>

            {/* Spacer ป้องกันชน bottom bar */}
            <div className="h-4 sm:h-0 pb-[env(safe-area-inset-bottom)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Components ---------------- */

function ProgressBar({ current }: { current: number }) {
  const ratio = STEPS.length > 1 ? current / (STEPS.length - 1) : 0;

  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200 shadow-sm">
      <div className="relative">
        {/* เส้นพื้นหลัง */}
        <div className="absolute left-6 right-6 top-6 -z-10 h-1 bg-zinc-200 rounded-full" />
        {/* โปรเกรสกราเดียนต์ */}
        <div
          className="absolute left-6 top-6 -z-10 h-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all"
          style={{ width: `calc(${ratio * 100}% + 0.75rem)` }}
        />
        {/* จุด/ป้าย */}
        <div className="grid grid-cols-4">
          {STEPS.map((s, i) => {
            const active = i <= current;
            return (
              <div key={s.label} className="flex flex-col items-center gap-2 text-center">
                <div
                  className={[
                    'flex h-10 w-10 items-center justify-center rounded-full font-medium transition',
                    active
                      ? 'bg-gradient-to-br from-indigo-500 to-emerald-500 text-white shadow-md ring-2 ring-white'
                      : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
                  ].join(' ')}
                >
                  {s.icon}
                </div>
                <span className={['text-xs sm:text-sm', active ? 'text-zinc-900 font-medium' : 'text-zinc-400'].join(' ')}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

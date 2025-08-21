"use client";
import React from "react";

export default function SafeAreaSpacer({
  height = 72,          // ปรับเป็นความสูง bottom nav ของคุณ (px)
  mobileOnly = true,    // แสดงเฉพาะมือถือ
}: { height?: number; mobileOnly?: boolean }) {
  return (
    <div
      aria-hidden
      className={mobileOnly ? "md:hidden" : ""}
      style={{ height: `calc(${height}px + env(safe-area-inset-bottom))` }}
    />
  );
}

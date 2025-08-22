// src/components/Navbar.tsx
"use client";
import React from "react";
import {
  Home, Car, FileText, Mail, UserCheck,
  LayoutDashboard, ClipboardCheck, LogOut
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItemsCustomer = [
  { icon: <Home size={20} />, href: "/", label: "Home" },
  { icon: <Car size={20} />, href: "/detect", label: "Detect" },
  { icon: <FileText size={20} />, href: "/reports", label: "Reports" },
  { icon: <Mail size={20} />, href: "/contact", label: "Contact" },
  { icon: <UserCheck size={20} />, href: "/claim", label: "New Claim" },
];

const navItemsAdmin = [
  { icon: <LayoutDashboard size={20} />, href: "/adminpage", label: "Dashboard" },
  { icon: <ClipboardCheck size={20} />, href: "/adminpage/reportsrequest", label: "Requests" },
  { icon: <UserCheck size={20} />, href: "/adminpage/users", label: "Users" },
  { icon: <LogOut size={20} />, href: "/logout", label: "Logout" },
];

type Role = "admin" | "customer" | null;

// เช็ค active แบบรองรับเส้นทางย่อย
function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
   // Dashboard แอดมินต้องตรงเป๊ะ (กันชนกับเส้นทางย่อย)
  if (href === "/adminpage") return pathname === "/adminpage";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar({ role }: { role?: Role }) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const items = isAdmin ? navItemsAdmin : navItemsCustomer;

  return (
    <>
      {/* Mobile: Floating Bottom Bar */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#1e1b4b] text-white rounded-full px-4 py-2 flex justify-around shadow-lg z-50 md:hidden">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className="flex items-center justify-center">
              <div
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={[
                  "p-2 rounded-full transition-all duration-200",
                  "hover:bg-indigo-500",
                  active
                    ? "bg-indigo-600 ring-2 ring-white/70 shadow-[0_0_0_3px_rgba(255,255,255,0.15)]"
                    : "",
                  !isAdmin && item.label === "New Claim"
                    ? "px-3 py-1 text-sm font-medium border border-blue-400"
                    : "",
                ].join(" ")}
              >
                {item.icon}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Desktop / Tablet Sidebar */}
      <aside
        className="
          hidden md:flex fixed inset-y-0 left-0
          w-20 bg-[#1e1b4b] text-white
          flex-col items-center py-4 gap-6 z-30
        "
      >
        {items
          .filter((it) => it.label !== "New Claim") // ปุ่มนี้มีเฉพาะลูกค้า (mobile)
          .map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
                    "hover:bg-indigo-700",
                    active ? "bg-indigo-600 ring-2 ring-white/70" : "",
                  ].join(" ")}
                >
                  {item.icon}
                </div>
              </Link>
            );
          })}

        <div className="mt-auto mb-4">
          <div className="w-9 h-9 rounded-full bg-white/30 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>
      </aside>
    </>
  );
}

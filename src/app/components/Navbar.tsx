// src/components/Navbar.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { Home, Car, FileText, Mail,  UserCheck, LayoutDashboard, ClipboardCheck, LogOut} from 'lucide-react';
import Link from 'next/link';

const navItemsCustomer = [
  { icon: <Home size={20} />, href: '/', label: 'Home' },
  { icon: <Car size={20} />, href: '/detect', label: 'Detect' },
  { icon: <FileText size={20} />, href: '/reports', label: 'Reports' },
  { icon: <Mail size={20} />, href: '/contact', label: 'Contact' },
  { icon: <UserCheck size={20} />, href: '/claim', label: 'New Claim' },
];


export default function Navbar() {


  
  return (
    <>
      {/* Mobile UI: Floating Bottom Bar (visible on screens < md) */}
        <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-[#1e1b4b] text-white rounded-full px-4 py-2 flex justify-around shadow-lg z-50 md:hidden">
            {navItemsCustomer.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-center">
                <div className={`p-2 rounded-full hover:bg-indigo-500 transition-all duration-200 ${item.label === 'New Claim' ? 'bg-indigo-600 px-3 py-1 text-sm font-medium text-white border border-blue-400' : ''}`}>
                  {item.icon}
                  {/* {item.label === 'New Claim' && <span className="ml-1">New Claim</span>} */}
                </div>
              </Link>
            ))
            }
        </nav>

      {/* Desktop / Tablet Sidebar (visible on md and up) */}
      <aside
        className="
          hidden md:flex
          fixed inset-y-0 left-0      /* กินสูงเต็มจอแบบไม่ต้องกำหนด h-screen เอง */
          w-20
          bg-[#1e1b4b] text-white
          flex-col items-center py-4 gap-6
          z-30
        "
      >

          {navItemsCustomer.
          filter((item) => item.label !== 'New Claim')
          .map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`w-10 h-10 flex items-center justify-center hover:bg-indigo-700 rounded-lg transition-colors ${
                  item.label === 'Home' ? 'bg-indigo-600' : ''
                }`}
              >
                {item.icon}
              </div>
            </Link>
          ))}
        


        <div className="mt-auto mb-4">
          <div className="w-9 h-9 rounded-full bg-white/30 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>
      </aside>
    </>
  );
}

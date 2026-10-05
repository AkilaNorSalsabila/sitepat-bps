'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import '@/components/auth-theme.css';

// Ikon garis sederhana (Heroicons)
const IKON = {
  beranda: 'M2.25 12l8.955-8.955a1.125 1.125 0 011.59 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  pegawai: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  notifikasi: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  akun: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  menu: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  keluar: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
};

function Ikon({ d }: { d: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const NAV = [
  { href: '/dashboard', label: 'Ringkasan', ikon: IKON.beranda },
  { href: '/dashboard/pegawai', label: 'Data pegawai', ikon: IKON.pegawai },
  { href: '/dashboard/notifikasi', label: 'Notifikasi', ikon: IKON.notifikasi },
  { href: '/dashboard/akun', label: 'Akun admin', ikon: IKON.akun },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [nama, setNama] = useState('');
  const [buka, setBuka] = useState(false); // menu di HP

  useEffect(() => {
    const periksa = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, status')
        .eq('id', data.user.id)
        .single();

      if (!profile || profile.status !== 'approved') {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      setNama(profile.full_name);
    };

    periksa();

    // Daftarkan service worker (syarat PWA dan push notification)
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, [router]);

  const keluar = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (!nama) return <p className="p-6 text-sm text-slate-500">Memuat...</p>;

  return (
    <div className="min-h-screen bg-[var(--st-page)]">
      {buka && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setBuka(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[var(--st-navy)] text-white flex flex-col transition-transform md:translate-x-0 ${
          buka ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 pt-7 pb-6">
          <img src="/logo-sitepat-light.png" alt="SiTepat" className="w-36 h-auto mx-auto" />
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((n) => {
            const aktif = n.href === '/dashboard' ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setBuka(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                  aktif ? 'bg-[var(--st-accent)] text-white' : 'text-sky-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Ikon d={n.ikon} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-sm font-semibold truncate">{nama}</p>
          <p className="text-xs text-sky-200/70">Admin</p>
          <button onClick={keluar} className="mt-3 flex items-center gap-2 text-sm text-sky-100/80 hover:text-white">
            <Ikon d={IKON.keluar} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Konten */}
      <div className="md:pl-64">
        <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setBuka(true)} aria-label="Buka menu" className="text-slate-700">
            <Ikon d={IKON.menu} />
          </button>
          <img src="/logo-sitepat.png" alt="SiTepat" className="h-7 w-auto" />
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}

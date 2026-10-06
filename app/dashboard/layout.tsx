'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { IKON, Icon } from '@/components/ui';
import '@/components/auth-theme.css';

const NAV = [
  { href: '/dashboard', label: 'Ringkasan', ikon: IKON.beranda },
  { href: '/dashboard/pegawai', label: 'Data pegawai', ikon: IKON.pegawai },
  { href: '/dashboard/kalender', label: 'Kalender', ikon: IKON.kalender },
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                  aktif ? 'bg-white/12 text-white shadow-[inset_3px_0_0_var(--st-gold)]' : 'text-sky-100/75 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon d={n.ikon} className="w-5 h-5" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mx-3 mb-3 rounded-xl bg-black/15">
          <p className="text-sm font-semibold truncate">{nama}</p>
          <p className="text-xs text-sky-200/70">Admin</p>
          <button onClick={keluar} className="mt-3 flex items-center gap-2 text-sm text-sky-100/80 hover:text-white">
            <Icon d={IKON.keluar} className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Konten */}
      <div className="md:pl-64">
        <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setBuka(true)} aria-label="Buka menu" className="text-slate-700">
            <Icon d={IKON.menu} className="w-6 h-6" />
          </button>
          <img src="/logo-sitepat.png" alt="SiTepat" className="h-7 w-auto" />
        </header>
        <main className="px-4 py-6 md:px-8 md:py-9 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}

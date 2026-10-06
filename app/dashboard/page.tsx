'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Pegawai, formatTanggal, statusKgb } from '@/lib/kgb';
import { Badge } from '@/components/ui';

export default function RingkasanPage() {
  const [rows, setRows] = useState<Pegawai[] | null>(null);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    const muat = async () => {
      const { data, error } = await supabase
        .from('pegawai')
        .select('*')
        .eq('status', 'aktif')
        .not('kgb_berikutnya', 'is', null)
        .order('kgb_berikutnya', { ascending: true });

      if (error) setGalat(error.message);
      else setRows(data as Pegawai[]);
    };
    muat();
  }, []);

  if (galat) return <p className="text-sm text-red-600">⚠️ {galat}</p>;
  if (!rows) return <p className="text-sm text-slate-500">Memuat...</p>;

  const status = rows.map((p) => statusKgb(p.kgb_berikutnya));
  const mendesak = status.filter((s) => s.nada === 'merah').length;
  const segera = status.filter((s) => s.nada === 'kuning').length;
  const pengecualian = rows.filter((p) => p.sumber === 'pengecualian').length;

  const kartu = [
    { label: 'Pegawai aktif', nilai: rows.length, warna: 'text-slate-900' },
    { label: 'Terlambat / hari ini', nilai: mendesak, warna: 'text-red-600' },
    { label: 'Perlu diproses', nilai: segera, warna: 'text-amber-600' },
    { label: 'Pengecualian NIP', nilai: pengecualian, warna: 'text-sky-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kartu.map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`text-3xl font-bold mt-1 ${k.warna}`}>{k.nilai}</p>
          </div>
        ))}
      </div>

      <section className="bg-white border border-slate-200 rounded-xl">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">KGB terdekat</h2>
          <Link href="/dashboard/pegawai" className="text-xs font-semibold text-[var(--st-link)] hover:underline">
            Lihat semua
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Belum ada data. Impor Excel atau tambah pegawai di menu Data pegawai.</p>
        ) : (
          <ul>
            {rows.slice(0, 8).map((p) => {
              const s = statusKgb(p.kgb_berikutnya);
              return (
                <li key={p.id} className="px-4 py-2.5 border-t border-slate-100 first:border-t-0 flex items-center gap-3 text-sm">
                  <span className="flex-1 font-medium text-slate-800">{p.nama}</span>
                  <span className="text-slate-500">{formatTanggal(p.kgb_berikutnya)}</span>
                  <Badge tone={s.nada}>{s.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

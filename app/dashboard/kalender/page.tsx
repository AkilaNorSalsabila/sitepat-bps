'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BULAN, Pegawai, formatTanggal, hariIniWIB, mulaiPengurusan, tambahTahun } from '@/lib/kgb';
import { Badge, btnGhost } from '@/components/ui';

const HARI = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg']; // minggu mulai Senin
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

type Kejadian = { jenis: 'mulai' | 'kgb'; pegawai: Pegawai; tanggal: string; kgb: string };

// ---- Ekspor .ics (Google Calendar, Apple Calendar, Outlook, kalender Windows) ----
const escIcs = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const tglIcs = (s: string) => s.replace(/-/g, '');
const besok = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

function buatIcs(daftar: Pegawai[]) {
  const stempel = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const baris = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SiTepat//KGB//ID', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:SiTepat - Pengurusan KGB'];

  for (const p of daftar) {
    if (!p.kgb_berikutnya) continue;
    // Siklus sekarang dan 2 tahun berikutnya (sesuai aturan: selesai -> maju 2 tahun)
    for (const kgb of [p.kgb_berikutnya, tambahTahun(p.kgb_berikutnya, 2)]) {
      const mulai = mulaiPengurusan(kgb);
      baris.push(
        'BEGIN:VEVENT',
        `UID:kgb-${p.id}-${kgb}@sitepat`,
        `DTSTAMP:${stempel}`,
        `DTSTART;VALUE=DATE:${tglIcs(mulai)}`,
        `DTEND;VALUE=DATE:${tglIcs(besok(mulai))}`,
        `SUMMARY:${escIcs(`Pengurusan SK KGB - ${p.nama}`)}`,
        `DESCRIPTION:${escIcs(`NIP ${p.nip}\nKGB: ${formatTanggal(kgb)}\nSetelah SK selesai, tekan "Tandai selesai" di SiTepat.`)}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escIcs(`Mulai urus SK KGB ${p.nama}`)}`,
        'TRIGGER:PT8H',
        'END:VALARM',
        'END:VEVENT'
      );
    }
  }
  baris.push('END:VCALENDAR');
  return baris.join('\r\n');
}

export default function KalenderPage() {
  const hariIni = hariIniWIB();
  const [tahun, setTahun] = useState(Number(hariIni.slice(0, 4)));
  const [bulan, setBulan] = useState(Number(hariIni.slice(5, 7))); // 1-12
  const [rows, setRows] = useState<Pegawai[] | null>(null);
  const [galat, setGalat] = useState('');
  const [dipilih, setDipilih] = useState<string | null>(hariIni);

  useEffect(() => {
    const muat = async () => {
      const { data, error } = await supabase
        .from('pegawai')
        .select('*')
        .eq('status', 'aktif')
        .not('kgb_berikutnya', 'is', null);
      if (error) setGalat(error.message);
      else setRows(data as Pegawai[]);
    };
    muat();
  }, []);

  // Semua kejadian: tanggal mulai pengurusan dan tanggal KGB
  const peta = useMemo(() => {
    const m = new Map<string, Kejadian[]>();
    for (const p of rows ?? []) {
      const kgb = p.kgb_berikutnya as string;
      for (const k of [
        { jenis: 'mulai' as const, tanggal: mulaiPengurusan(kgb) },
        { jenis: 'kgb' as const, tanggal: kgb },
      ]) {
        const arr = m.get(k.tanggal) ?? [];
        arr.push({ ...k, pegawai: p, kgb });
        m.set(k.tanggal, arr);
      }
    }
    return m;
  }, [rows]);

  const geser = (n: number) => {
    const total = tahun * 12 + (bulan - 1) + n;
    setTahun(Math.floor(total / 12));
    setBulan((total % 12) + 1);
    setDipilih(null);
  };

  const unduh = () => {
    const blob = new Blob([buatIcs(rows ?? [])], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitepat-kgb.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (galat) return <p className="text-sm text-red-600">⚠️ {galat}</p>;
  if (!rows) return <p className="text-sm text-slate-500">Memuat...</p>;

  // Susun sel kalender (Senin pertama)
  const jumlahHari = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  const awal = (new Date(Date.UTC(tahun, bulan - 1, 1)).getUTCDay() + 6) % 7; // 0 = Senin
  const sel: (string | null)[] = [
    ...Array(awal).fill(null),
    ...Array.from({ length: jumlahHari }, (_, i) => iso(tahun, bulan, i + 1)),
  ];
  while (sel.length % 7 !== 0) sel.push(null);

  const detail = dipilih ? peta.get(dipilih) ?? [] : [];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-slate-900 mr-auto">Kalender KGB</h1>
        <button className={btnGhost} onClick={unduh} disabled={rows.length === 0}>Unduh .ics (kalender HP/laptop)</button>
      </div>

      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5">
        <button className={btnGhost} onClick={() => geser(-1)}>&larr; Sebelumnya</button>
        <p className="font-bold text-slate-900">{BULAN[bulan - 1]} {tahun}</p>
        <button className={btnGhost} onClick={() => geser(1)}>Berikutnya &rarr;</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 text-xs font-semibold text-slate-600">
          {HARI.map((h) => <div key={h} className="p-2 text-center">{h}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {sel.map((tgl, i) => {
            if (!tgl) return <div key={i} className="min-h-20 border-t border-slate-100 bg-slate-50/50" />;
            const ev = peta.get(tgl) ?? [];
            const hariKe = Number(tgl.slice(8));
            return (
              <button
                key={tgl}
                onClick={() => setDipilih(tgl)}
                className={`min-h-20 border-t border-l first:border-l-0 border-slate-100 p-1.5 text-left align-top hover:bg-sky-50 ${
                  dipilih === tgl ? 'bg-sky-50 ring-2 ring-inset ring-[var(--st-sky)]' : ''
                }`}
              >
                <span className={`text-xs font-semibold ${tgl === hariIni ? 'bg-[var(--st-accent)] text-white rounded-full px-1.5 py-0.5' : 'text-slate-700'}`}>
                  {hariKe}
                </span>
                <span className="block mt-1 space-y-0.5">
                  {ev.slice(0, 2).map((k) => (
                    <span
                      key={`${k.jenis}-${k.pegawai.id}`}
                      className={`block truncate text-[10px] leading-tight rounded px-1 py-0.5 ${
                        k.jenis === 'kgb'
                          ? 'bg-slate-100 text-slate-700'
                          : tgl <= hariIni
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {k.jenis === 'kgb' ? 'KGB ' : 'Urus '}{k.pegawai.nama}
                    </span>
                  ))}
                  {ev.length > 2 && <span className="block text-[10px] text-slate-500">+{ev.length - 2} lagi</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        <h2 className="font-bold text-slate-900 text-sm">
          {dipilih ? `Tanggal ${Number(dipilih.slice(8))} ${BULAN[Number(dipilih.slice(5, 7)) - 1]} ${dipilih.slice(0, 4)}` : 'Pilih tanggal'}
        </h2>
        {dipilih && detail.length === 0 && <p className="text-sm text-slate-500">Tidak ada agenda.</p>}
        <ul className="divide-y divide-slate-100 text-sm">
          {detail.map((k) => (
            <li key={`${k.jenis}-${k.pegawai.id}`} className="py-2 flex items-center justify-between gap-3">
              <span>
                <span className="font-medium text-slate-800">{k.pegawai.nama}</span>
                <span className="block text-xs text-slate-400 font-mono">{k.pegawai.nip}</span>
              </span>
              {k.jenis === 'mulai' ? (
                <Badge tone={k.tanggal <= hariIni ? 'merah' : 'kuning'}>Mulai urus SK (KGB {formatTanggal(k.kgb)})</Badge>
              ) : (
                <Badge>Tanggal KGB</Badge>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-slate-500">
        Pegawai yang sudah ditandai selesai otomatis pindah ke jadwal 2 tahun berikutnya. File .ics hanya salinan saat diunduh,
        jadi unduh dan impor ulang setelah ada perubahan jadwal.
      </p>
    </div>
  );
}

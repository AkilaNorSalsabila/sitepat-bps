'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Pegawai, formatTanggal, mulaiPengurusan, statusKgb } from '@/lib/kgb';
import { Avatar, Badge, IKON, Icon, btnGhost } from '@/components/ui';

const hariIni = () =>
  new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

const salam = () => {
  const jam = Number(
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).slice(0, 2)
  );
  if (jam < 11) return 'Selamat pagi';
  if (jam < 15) return 'Selamat siang';
  if (jam < 18) return 'Selamat sore';
  return 'Selamat malam';
};

type Nada = 'merah' | 'kuning' | 'hijau' | 'biru';

const GAYA_KARTU: Record<Nada, { ikon: string; angka: string }> = {
  merah: { ikon: 'bg-red-50 text-red-600', angka: 'text-red-600' },
  kuning: { ikon: 'bg-amber-50 text-amber-600', angka: 'text-amber-600' },
  hijau: { ikon: 'bg-emerald-50 text-emerald-600', angka: 'text-emerald-600' },
  biru: { ikon: 'bg-sky-50 text-sky-700', angka: 'text-slate-900' },
};

function KartuStat({
  href,
  label,
  keterangan,
  nilai,
  nada,
  ikon,
}: {
  href: string;
  label: string;
  keterangan: string;
  nilai: number;
  nada: Nada;
  ikon: string;
}) {
  const g = GAYA_KARTU[nada];
  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-sm shadow-slate-900/[0.03] p-5 flex items-start gap-4 hover:ring-slate-300 hover:shadow-md transition"
    >
      <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${g.ikon}`}>
        <Icon d={ikon} className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className={`text-3xl font-bold tabular-nums leading-tight mt-0.5 ${g.angka}`}>{nilai}</p>
        <p className="text-xs text-slate-400 mt-0.5 group-hover:text-slate-500 transition-colors">{keterangan}</p>
      </div>
    </Link>
  );
}

function BarisPegawai({ p, className = '' }: { p: Pegawai; className?: string }) {
  const s = statusKgb(p.kgb_berikutnya);
  return (
    <li className={className}>
      <Link
        href={`/dashboard/pegawai?cari=${encodeURIComponent(p.nip)}`}
        className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/70 transition-colors"
      >
        <Avatar nama={p.nama} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 text-sm truncate">{p.nama}</p>
          <p className="text-xs text-slate-500 truncate">
            KGB {formatTanggal(p.kgb_berikutnya)}
            {p.kgb_berikutnya && <span className="text-slate-400"> · mulai urus {formatTanggal(mulaiPengurusan(p.kgb_berikutnya))}</span>}
          </p>
        </div>
        <Badge tone={s.nada}>{s.label}</Badge>
      </Link>
    </li>
  );
}

function Panel({
  judul,
  sub,
  aksiHref,
  aksiLabel,
  children,
}: {
  judul: string;
  sub?: string;
  aksiHref?: string;
  aksiLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="h-full bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-sm shadow-slate-900/[0.03] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="mr-auto min-w-0">
          <h2 className="font-bold text-slate-900">{judul}</h2>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        {aksiHref && (
          <Link href={aksiHref} className="text-xs font-semibold text-[var(--st-link)] hover:underline whitespace-nowrap">
            {aksiLabel ?? 'Lihat semua'} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Kosong({ judul, pesan, ikon }: { judul: string; pesan: string; ikon: string }) {
  return (
    <div className="py-10 px-6 text-center">
      <span className="mx-auto w-11 h-11 rounded-full bg-slate-100 text-slate-400 grid place-items-center">
        <Icon d={ikon} className="w-5 h-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">{judul}</p>
      <p className="text-xs text-slate-500 mt-0.5">{pesan}</p>
    </div>
  );
}

function Rangka() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      <div className="h-16 w-72 rounded-xl bg-slate-200/70" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="h-60 rounded-2xl bg-slate-200/70 xl:col-span-2" />
        <div className="h-60 rounded-2xl bg-slate-200/70" />
      </div>
      <div className="h-72 rounded-2xl bg-slate-200/70" />
    </div>
  );
}

export default function RingkasanPage() {
  const [rows, setRows] = useState<Pegawai[] | null>(null);
  const [galat, setGalat] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let batal = false;
    const muat = async () => {
      const { data, error } = await supabase
        .from('pegawai')
        .select('*')
        .eq('status', 'aktif')
        .not('kgb_berikutnya', 'is', null)
        .order('kgb_berikutnya', { ascending: true });
      if (batal) return;
      if (error) setGalat(error.message);
      else {
        setGalat('');
        setRows(data as Pegawai[]);
      }
    };
    muat();
    return () => {
      batal = true;
    };
  }, [tick]);

  if (galat) {
    return (
      <div className="bg-red-50 ring-1 ring-inset ring-red-200 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-red-700 mr-auto">Data tidak bisa dimuat: {galat}</p>
        <button className={btnGhost} onClick={() => setTick((t) => t + 1)}>
          Coba lagi
        </button>
      </div>
    );
  }
  if (!rows) return <Rangka />;

  const dengan = rows.map((p) => ({ p, s: statusKgb(p.kgb_berikutnya) }));
  const terlambat = dengan.filter((x) => x.s.nada === 'merah');
  const perluProses = dengan.filter((x) => x.s.nada === 'kuning');
  const perhatian = [...terlambat, ...perluProses];
  const aman = dengan.filter((x) => x.s.nada !== 'merah' && x.s.nada !== 'kuning');
  const pengecualian = rows.filter((p) => p.sumber === 'pengecualian').length;

  // Sebaran per tahun
  const perTahun = new Map<string, number>();
  for (const p of rows) {
    const t = p.kgb_berikutnya?.slice(0, 4);
    if (t) perTahun.set(t, (perTahun.get(t) ?? 0) + 1);
  }
  const daftarTahun = [...perTahun.entries()].sort(([a], [b]) => a.localeCompare(b));
  const maks = Math.max(1, ...daftarTahun.map(([, n]) => n));

  const butuhTindakan = perhatian.length;

  return (
    <div className="space-y-6">
      {/* Kepala */}
      <div>
        <p className="text-sm text-slate-500">{hariIni()}</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">{salam()} 👋</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {butuhTindakan > 0 ? (
            <>
              Ada <b className="text-slate-800">{butuhTindakan} pegawai</b> yang KGB-nya perlu segera diurus.
            </>
          ) : (
            'Semua jadwal KGB aman, tidak ada yang perlu diurus sekarang.'
          )}
        </p>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KartuStat
          href="/dashboard/pegawai"
          label="Pegawai aktif"
          keterangan="Lihat semua data"
          nilai={rows.length}
          nada="biru"
          ikon={IKON.pegawai}
        />
        <KartuStat
          href="/dashboard/pegawai?tampil=segera"
          label="Terlambat / hari ini"
          keterangan="Segera proses"
          nilai={terlambat.length}
          nada="merah"
          ikon={IKON.notifikasi}
        />
        <KartuStat
          href="/dashboard/pegawai?tampil=segera"
          label="Perlu diproses"
          keterangan="Masa pengurusan 1 bulan"
          nilai={perluProses.length}
          nada="kuning"
          ikon={IKON.kalender}
        />
        <KartuStat
          href="/dashboard/pegawai"
          label="Pengecualian NIP"
          keterangan="Jadwal memakai aturan khusus"
          nilai={pengecualian}
          nada="biru"
          ikon={IKON.akun}
        />
      </div>

      {/* Baris 1: perlu perhatian + sebaran per tahun (tinggi sama) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        <div className="xl:col-span-2">
          <Panel
            judul="Perlu perhatian"
            sub="Terlambat dan masuk masa pengurusan"
            aksiHref="/dashboard/pegawai?tampil=segera"
          >
            {perhatian.length === 0 ? (
              <Kosong judul="Tidak ada yang mendesak" pesan="Semua KGB masih di luar masa pengurusan." ikon={IKON.selesai} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {perhatian.slice(0, 6).map(({ p }) => (
                  <BarisPegawai key={p.id} p={p} />
                ))}
              </ul>
            )}
            {perhatian.length > 6 && (
              <p className="px-5 py-3 text-xs text-slate-500 border-t border-slate-100 bg-slate-50/60">
                +{perhatian.length - 6} pegawai lainnya.{' '}
                <Link href="/dashboard/pegawai?tampil=segera" className="font-semibold text-[var(--st-link)] hover:underline">
                  Lihat semua
                </Link>
              </p>
            )}
          </Panel>
        </div>

        <div>
          <Panel judul="Sebaran per tahun" sub="Jumlah KGB berikutnya">
            {daftarTahun.length === 0 ? (
              <Kosong judul="Belum ada jadwal" pesan="Data akan tampil setelah ada pegawai aktif." ikon={IKON.kalender} />
            ) : (
              <ul className="px-5 py-4 space-y-3">
                {daftarTahun.map(([t, n]) => (
                  <li key={t} className="flex items-center gap-3 text-sm">
                    <span className="w-10 font-semibold text-slate-700 tabular-nums">{t}</span>
                    <span className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-[var(--st-navy)]"
                        style={{ width: `${Math.max(6, (n / maks) * 100)}%` }}
                      />
                    </span>
                    <span className="w-7 text-right font-semibold text-slate-800 tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* Baris 2: KGB akan datang, lebar penuh, dua kolom */}
      <Panel judul="KGB akan datang" sub="Jadwal terdekat setelah masa pengurusan" aksiHref="/dashboard/pegawai">
        {aman.length === 0 ? (
          <Kosong judul="Belum ada data" pesan="Impor Excel atau tambah pegawai di menu Data pegawai." ikon={IKON.kosong} />
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2">
            {aman.slice(0, 8).map(({ p }, i) => (
              <BarisPegawai
                key={p.id}
                p={p}
                className={`border-b border-slate-100 ${i % 2 === 0 ? 'lg:border-r' : ''}`}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
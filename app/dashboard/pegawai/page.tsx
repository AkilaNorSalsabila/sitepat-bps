'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Pegawai, dalamMasaPengurusan, formatTanggal, mulaiPengurusan, statusKgb, tambahTahun } from '@/lib/kgb';
import { Avatar, Badge, ConfirmDialog, IKON, Icon, IconButton, Modal, btnGhost, btnPrimary } from '@/components/ui';
import PegawaiForm from '@/components/PegawaiForm';
import ImportExcel from '@/components/ImportExcel';

type Riwayat = { id: number; pegawai_id: string; tanggal_kgb: string; diproses_at: string };
type FilterStatus = 'semua' | 'segera' | 'aman';

const GRID_JADWAL = 'lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,0.9fr)_168px]';
const GRID_SELESAI = 'lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1.3fr)]';
const PILIHAN_HALAMAN = [10, 20, 50];
const TAHUN_INI = Number(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).slice(0, 4));

const AKSEN: Record<string, string> = {
  merah: 'border-l-red-500',
  kuning: 'border-l-amber-400',
  hijau: 'border-l-emerald-400',
};

const tglProses = (ts: string) =>
  new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

export default function PegawaiPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat...</p>}>
      <DaftarPegawai />
    </Suspense>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="lg:hidden block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{children}</span>;
}

function Centang({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2.5 rounded-xl ring-1 ring-inset transition ${
        value ? 'bg-sky-50 text-[var(--st-accent)] ring-sky-300' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      <span
        className={`relative w-7 h-4 rounded-full transition ${value ? 'bg-[var(--st-accent)]' : 'bg-slate-300'}`}
        aria-hidden
      >
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${value ? 'left-3.5' : 'left-0.5'}`} />
      </span>
      {label}
    </button>
  );
}

function ChipTahun({
  hitung,
  nilai,
  onPilih,
  dari,
  sampai,
}: {
  hitung: Map<string, number>;
  nilai: string;
  onPilih: (t: string) => void;
  dari: number; // tahun pertama yang jadi chip
  sampai: number; // tahun terakhir yang jadi chip
}) {
  const semuaTahun = [...hitung.keys()].sort();
  if (semuaTahun.length === 0) return null;

  const utama = semuaTahun.filter((t) => Number(t) >= dari && Number(t) <= sampai);
  const lain = semuaTahun.filter((t) => !utama.includes(t)).sort().reverse();
  const jmlLain = lain.reduce((a, t) => a + (hitung.get(t) ?? 0), 0);
  const lainAktif = lain.includes(nilai);

  const gaya = (aktif: boolean) =>
    `text-xs font-semibold px-3.5 py-2 rounded-full ring-1 ring-inset transition ${
      aktif ? 'bg-[var(--st-navy)] text-white ring-[var(--st-navy)]' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Saring menurut tahun">
      <span className="text-xs font-semibold text-slate-500 mr-1">Tahun KGB</span>
      {['semua', ...utama].map((t) => (
        <button key={t} type="button" onClick={() => onPilih(t)} aria-pressed={nilai === t} className={gaya(nilai === t)}>
          {t === 'semua' ? 'Semua' : t}
          {t !== 'semua' && <span className={`ml-1.5 ${nilai === t ? 'text-sky-200' : 'text-slate-400'}`}>{hitung.get(t)}</span>}
        </button>
      ))}

      {(
        <span className="relative inline-flex items-center">
          <select
            aria-label="Tahun lainnya"
            disabled={lain.length === 0}
            title={lain.length === 0 ? 'Semua tahun sudah tampil sebagai chip' : undefined}
            value={lainAktif ? nilai : ''}
            onChange={(e) => e.target.value && onPilih(e.target.value)}
            className={`appearance-none cursor-pointer pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--st-sky)] disabled:opacity-60 disabled:cursor-not-allowed ${gaya(lainAktif)}`}
          >
            <option value="" className="text-slate-800 bg-white">
              {lain.length === 0 ? 'Tahun lain (tidak ada)' : `Tahun lain (${jmlLain})`}
            </option>
            {lain.map((t) => (
              <option key={t} value={t} className="text-slate-800 bg-white">
                {t} ({hitung.get(t)})
              </option>
            ))}
          </select>
          <span className={`pointer-events-none absolute right-3 text-[10px] ${lainAktif ? 'text-white' : 'text-slate-400'}`}>▾</span>
        </span>
      )}
    </div>
  );
}

function KartuStatus({
  label,
  jumlah,
  aktif,
  warna,
  onClick,
}: {
  label: string;
  jumlah: number;
  aktif: boolean;
  warna: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={`text-left rounded-2xl px-4 py-3 ring-1 ring-inset transition flex items-center gap-3 ${
        aktif ? 'bg-white ring-[var(--st-navy)] shadow-sm' : 'bg-white/70 ring-slate-200 hover:bg-white hover:ring-slate-300'
      }`}
    >
      <span className={`w-2.5 h-9 rounded-full ${warna}`} />
      <span>
        <span className="block text-2xl font-bold text-slate-900 tabular-nums leading-none">{jumlah}</span>
        <span className="block text-xs font-semibold text-slate-500 mt-1">{label}</span>
      </span>
    </button>
  );
}

function Paginasi({
  total,
  satuan,
  halaman,
  perHalaman,
  totalHalaman,
  onHalaman,
  onPerHalaman,
}: {
  total: number;
  satuan: string;
  halaman: number;
  perHalaman: number;
  totalHalaman: number;
  onHalaman: (h: number) => void;
  onPerHalaman: (n: number) => void;
}) {
  if (total <= PILIHAN_HALAMAN[0]) return null;

  const dari = (halaman - 1) * perHalaman + 1;
  const sampai = Math.min(halaman * perHalaman, total);

  const nomor: (number | '…')[] = [];
  if (totalHalaman <= 7) {
    for (let i = 1; i <= totalHalaman; i++) nomor.push(i);
  } else {
    nomor.push(1);
    const kiri = Math.max(2, halaman - 1);
    const kanan = Math.min(totalHalaman - 1, halaman + 1);
    if (kiri > 2) nomor.push('…');
    for (let i = kiri; i <= kanan; i++) nomor.push(i);
    if (kanan < totalHalaman - 1) nomor.push('…');
    nomor.push(totalHalaman);
  }

  const kotak = 'min-w-9 h-9 px-2 rounded-lg text-sm font-semibold grid place-items-center transition';
  const panah = (arah: 'kiri' | 'kanan') => {
    const nonaktif = arah === 'kiri' ? halaman <= 1 : halaman >= totalHalaman;
    return (
      <button
        type="button"
        disabled={nonaktif}
        aria-label={arah === 'kiri' ? 'Halaman sebelumnya' : 'Halaman berikutnya'}
        onClick={() => onHalaman(arah === 'kiri' ? halaman - 1 : halaman + 1)}
        className={`${kotak} ring-1 ring-inset ring-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d={arah === 'kiri' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
        </svg>
      </button>
    );
  };

  return (
    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        <span>
          Menampilkan <b className="text-slate-700">{dari}–{sampai}</b> dari <b className="text-slate-700">{total}</b> {satuan}
        </span>
        <label className="inline-flex items-center gap-2">
          Tampil
          <select
            value={perHalaman}
            onChange={(e) => onPerHalaman(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--st-sky)]"
          >
            {PILIHAN_HALAMAN.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          per halaman
        </label>
      </div>

      <nav className="flex items-center gap-1.5" aria-label="Halaman">
        {panah('kiri')}
        {nomor.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="w-6 text-center text-slate-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onHalaman(n)}
              aria-current={n === halaman ? 'page' : undefined}
              className={`${kotak} ${
                n === halaman
                  ? 'bg-[var(--st-navy)] text-white'
                  : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {n}
            </button>
          )
        )}
        {panah('kanan')}
      </nav>
    </div>
  );
}

function Rangka() {
  return (
    <ul className="divide-y divide-slate-100 animate-pulse" aria-busy="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="px-5 py-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-slate-200" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 w-1/3 rounded bg-slate-200" />
            <span className="block h-3 w-1/4 rounded bg-slate-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function DaftarPegawai() {
  const sp = useSearchParams();
  const [rows, setRows] = useState<Pegawai[]>([]);
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [galatRiwayat, setGalatRiwayat] = useState('');
  const [tab, setTab] = useState<'jadwal' | 'selesai'>('jadwal');
  const [cari, setCari] = useState(sp.get('cari') ?? '');
  const [semua, setSemua] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>(sp.get('tampil') === 'segera' ? 'segera' : 'semua');
  const [tahunJadwal, setTahunJadwal] = useState('semua');
  const [tahunSelesai, setTahunSelesai] = useState('semua');
  const [halaman, setHalaman] = useState(1);
  const [perHalaman, setPerHalaman] = useState(PILIHAN_HALAMAN[0]);
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState<{ data: Pegawai | null } | null>(null);
  const [impor, setImpor] = useState(false);
  const [selesai, setSelesai] = useState<Pegawai | null>(null);
  const [hapus, setHapus] = useState<Pegawai | null>(null);
  const [proses, setProses] = useState(false);
  const [galatDialog, setGalatDialog] = useState('');

  const muatUlang = () => setTick((t) => t + 1);

  useEffect(() => {
    let batal = false;
    const muat = async () => {
      const [pg, rw] = await Promise.all([
        supabase.from('pegawai').select('*').order('kgb_berikutnya', { ascending: true, nullsFirst: false }),
        supabase.from('kgb_riwayat').select('id, pegawai_id, tanggal_kgb, diproses_at').order('diproses_at', { ascending: false }),
      ]);
      if (batal) return;
      if (pg.error) setGalat(pg.error.message);
      else {
        setGalat('');
        setRows(pg.data as Pegawai[]);
      }
      if (rw.error) setGalatRiwayat(rw.error.message);
      else {
        setGalatRiwayat('');
        setRiwayat(rw.data as Riwayat[]);
      }
      setMemuat(false);
    };
    muat();
    return () => {
      batal = true;
    };
  }, [tick]);

  // Kembali ke halaman 1 setiap filter atau jumlah per halaman berubah
  useEffect(() => {
    setHalaman(1);
  }, [tab, cari, semua, filter, tahunJadwal, tahunSelesai, perHalaman]);

  const tutupDialog = () => {
    setSelesai(null);
    setHapus(null);
    setGalatDialog('');
  };

  const jalankanSelesai = async () => {
    if (!selesai) return;
    setProses(true);
    const { error } = await supabase.rpc('tandai_kgb_selesai', { p_id: selesai.id });
    setProses(false);
    if (error) return setGalatDialog(error.message);
    tutupDialog();
    muatUlang();
  };

  const jalankanHapus = async () => {
    if (!hapus) return;
    setProses(true);
    // .select() agar kelihatan berapa baris yang benar-benar terhapus (RLS bisa menolak tanpa error)
    const { data, error } = await supabase.from('pegawai').delete().eq('id', hapus.id).select('id');
    setProses(false);
    if (error) {
      setGalatDialog(
        error.code === '23503'
          ? 'Data ini masih dipakai tabel lain (mis. riwayat KGB), jadi tidak bisa dihapus. Ubah statusnya menjadi pensiun/pindah saja.'
          : error.message
      );
      return;
    }
    if (!data || data.length === 0) {
      setGalatDialog('Tidak ada data yang terhapus. Kemungkinan Supabase belum mengizinkan hapus (RLS policy DELETE).');
      return;
    }
    tutupDialog();
    muatUlang();
  };

  const kata = cari.trim().toLowerCase();
  const cocokKata = (p: Pegawai) => !kata || p.nama.toLowerCase().includes(kata) || p.nip.includes(kata);

  /* ---- Tab "Jadwal KGB" ---- */
  const dasar = rows.filter((p) => semua || p.status === 'aktif');
  const dasarCari = dasar.filter(cocokKata);
  const perluProses = (p: Pegawai) => p.status === 'aktif' && dalamMasaPengurusan(p.kgb_berikutnya);
  const jmlSegera = dasarCari.filter(perluProses).length;
  const jmlAman = dasarCari.filter((p) => p.status === 'aktif' && !!p.kgb_berikutnya && !dalamMasaPengurusan(p.kgb_berikutnya)).length;

  const dasarStatus = dasarCari.filter((p) =>
    filter === 'segera'
      ? perluProses(p)
      : filter === 'aman'
        ? p.status === 'aktif' && !!p.kgb_berikutnya && !dalamMasaPengurusan(p.kgb_berikutnya)
        : true
  );

  const hitungJadwal = new Map<string, number>();
  for (const p of dasarStatus) {
    if (!p.kgb_berikutnya) continue;
    const t = p.kgb_berikutnya.slice(0, 4);
    hitungJadwal.set(t, (hitungJadwal.get(t) ?? 0) + 1);
  }
  const thJadwal = tahunJadwal === 'semua' || hitungJadwal.has(tahunJadwal) ? tahunJadwal : 'semua';
  const tampil = dasarStatus.filter((p) => thJadwal === 'semua' || !!p.kgb_berikutnya?.startsWith(thJadwal));

  /* ---- Tab "Sudah selesai" (dari tabel kgb_riwayat) ---- */
  const petaPegawai = new Map(rows.map((p) => [p.id, p]));
  const hitungSelesai = new Map<string, number>();
  for (const r of riwayat) {
    const t = r.tanggal_kgb.slice(0, 4);
    hitungSelesai.set(t, (hitungSelesai.get(t) ?? 0) + 1);
  }
  const thSelesai = tahunSelesai === 'semua' || hitungSelesai.has(tahunSelesai) ? tahunSelesai : 'semua';

  const tampilSelesai = riwayat.filter((r) => {
    const p = petaPegawai.get(r.pegawai_id);
    return (thSelesai === 'semua' || r.tanggal_kgb.startsWith(thSelesai)) && (!kata || (!!p && cocokKata(p)));
  });

  const jumlah = tab === 'jadwal' ? tampil.length : tampilSelesai.length;
  const totalHalaman = Math.max(1, Math.ceil(jumlah / perHalaman));
  const halAman = Math.min(halaman, totalHalaman);
  const awal = (halAman - 1) * perHalaman;
  const adaFilter = !!kata || filter !== 'semua' || thJadwal !== 'semua' || semua;
  const resetFilter = () => {
    setCari('');
    setFilter('semua');
    setTahunJadwal('semua');
    setSemua(false);
  };

  return (
    <div className="space-y-5">
      {/* Kepala */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data pegawai</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {memuat ? 'Memuat data...' : tab === 'jadwal' ? `${jumlah} pegawai ditampilkan` : `${jumlah} catatan KGB selesai`}
          </p>
        </div>
        <button className={btnGhost} onClick={() => setImpor(true)}>
          <Icon d={IKON.impor} /> Impor Excel
        </button>
        <button className={btnPrimary} onClick={() => setForm({ data: null })}>
          <Icon d={IKON.tambah} /> Tambah pegawai
        </button>
      </div>

      {/* Pilihan tampilan */}
      <div className="inline-flex p-1 rounded-xl bg-slate-100" role="tablist">
        {(
          [
            ['jadwal', 'Jadwal KGB'],
            ['selesai', `Sudah selesai${riwayat.length ? ` (${riwayat.length})` : ''}`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Pencarian */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon d={IKON.cari} className="w-[18px] h-[18px]" />
          </span>
          <input
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--st-sky)] focus:border-transparent transition"
            placeholder="Cari nama atau NIP"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
          {cari && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => setCari('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 grid place-items-center text-base leading-none"
            >
              ×
            </button>
          )}
        </div>
        {tab === 'jadwal' && <Centang label="Tampilkan non-aktif" value={semua} onChange={setSemua} />}
        {tab === 'jadwal' && adaFilter && (
          <button type="button" onClick={resetFilter} className="text-xs font-semibold text-[var(--st-link)] hover:underline px-2 py-2">
            Reset filter
          </button>
        )}
      </div>

      {/* Filter status (kartu) */}
      {tab === 'jadwal' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KartuStatus
            label="Semua pegawai"
            jumlah={dasarCari.length}
            aktif={filter === 'semua'}
            warna="bg-slate-300"
            onClick={() => setFilter('semua')}
          />
          <KartuStatus
            label="Perlu diproses (termasuk terlambat)"
            jumlah={jmlSegera}
            aktif={filter === 'segera'}
            warna="bg-amber-400"
            onClick={() => setFilter(filter === 'segera' ? 'semua' : 'segera')}
          />
          <KartuStatus
            label="Masih aman"
            jumlah={jmlAman}
            aktif={filter === 'aman'}
            warna="bg-emerald-400"
            onClick={() => setFilter(filter === 'aman' ? 'semua' : 'aman')}
          />
        </div>
      )}

      {tab === 'jadwal' ? (
        <ChipTahun hitung={hitungJadwal} nilai={thJadwal} onPilih={setTahunJadwal} dari={TAHUN_INI} sampai={TAHUN_INI + 2} />
      ) : (
        <ChipTahun hitung={hitungSelesai} nilai={thSelesai} onPilih={setTahunSelesai} dari={TAHUN_INI - 2} sampai={TAHUN_INI} />
      )}

      {galat && (
        <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-200 rounded-xl px-4 py-3">{galat}</p>
      )}

      {tab === 'jadwal' ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-sm shadow-slate-900/[0.03] overflow-hidden">
          <div className={`hidden lg:grid ${GRID_JADWAL} gap-4 px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500`}>
            <span>Pegawai</span>
            <span>KGB berikutnya</span>
            <span>Status</span>
            <span>Sumber</span>
            <span className="text-right">Aksi</span>
          </div>

          {memuat && <Rangka />}

          {!memuat && tampil.length === 0 && (
            <div className="py-14 px-6 text-center">
              <span className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 grid place-items-center">
                <Icon d={IKON.kosong} className="w-6 h-6" />
              </span>
              <p className="mt-3 font-semibold text-slate-700">{adaFilter ? 'Tidak ada pegawai yang cocok' : 'Belum ada data pegawai'}</p>
              <p className="text-sm text-slate-500">
                {adaFilter ? 'Coba ubah pencarian atau filter yang aktif.' : 'Gunakan Impor Excel atau Tambah pegawai untuk memulai.'}
              </p>
              {adaFilter && (
                <button className={`${btnGhost} mt-4`} onClick={resetFilter}>
                  Reset filter
                </button>
              )}
            </div>
          )}

          <ul className="divide-y divide-slate-100">
            {tampil.slice(awal, awal + perHalaman).map((p) => {
              const s = statusKgb(p.kgb_berikutnya);
              const aktif = p.status === 'aktif';
              return (
                <li
                  key={p.id}
                  className={`grid grid-cols-1 ${GRID_JADWAL} gap-x-4 gap-y-3 pl-4 pr-5 py-4 items-center border-l-4 hover:bg-slate-50/60 transition-colors ${
                    aktif ? (AKSEN[s.nada] ?? 'border-l-transparent') : 'border-l-transparent opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar nama={p.nama} />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{p.nama}</p>
                      <p className="text-xs text-slate-500 truncate">{[p.jabatan, p.golongan].filter(Boolean).join(' · ') || '-'}</p>
                      <p className="text-xs text-slate-400 font-mono tabular-nums">{p.nip}</p>
                    </div>
                  </div>

                  <div className="text-sm">
                    <Label>KGB berikutnya</Label>
                    <p className="font-semibold text-slate-800">{aktif ? formatTanggal(p.kgb_berikutnya) : '-'}</p>
                    {aktif && p.kgb_berikutnya && (
                      <p className="text-xs text-slate-500">Mulai urus {formatTanggal(mulaiPengurusan(p.kgb_berikutnya))}</p>
                    )}
                  </div>

                  <div>
                    <Label>Status</Label>
                    {aktif ? <Badge tone={s.nada}>{s.label}</Badge> : <Badge>{p.status}</Badge>}
                  </div>

                  <div>
                    <Label>Sumber</Label>
                    <Badge
                      titik={false}
                      tone={p.sumber === 'pengecualian' ? 'kuning' : p.sumber === 'manual' ? 'biru' : 'hijau'}
                      title={p.alasan ?? undefined}
                    >
                      {p.sumber}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-1 pt-2 lg:pt-0 border-t border-slate-100 lg:border-0">
                    {aktif && p.kgb_berikutnya ? (
                      <button
                        type="button"
                        onClick={() => setSelesai(p)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 transition"
                      >
                        <Icon d={IKON.selesai} className="w-4 h-4" /> Selesai
                      </button>
                    ) : (
                      <span />
                    )}
                    <span className="flex items-center gap-0.5">
                      <IconButton d={IKON.ubah} label="Ubah" tone="biru" onClick={() => setForm({ data: p })} />
                      <IconButton d={IKON.hapus} label="Hapus" tone="merah" onClick={() => setHapus(p)} />
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {!memuat && (
            <Paginasi
              total={tampil.length}
              satuan="pegawai"
              halaman={halAman}
              perHalaman={perHalaman}
              totalHalaman={totalHalaman}
              onHalaman={setHalaman}
              onPerHalaman={setPerHalaman}
            />
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-sm shadow-slate-900/[0.03] overflow-hidden">
          <div className={`hidden lg:grid ${GRID_SELESAI} gap-4 px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500`}>
            <span>Pegawai</span>
            <span>KGB yang diselesaikan</span>
            <span>Ditandai selesai pada</span>
            <span>Jadwal berikutnya</span>
          </div>

          {galatRiwayat && (
            <p className="m-4 text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-200 rounded-xl px-4 py-3">
              Riwayat tidak bisa dibaca: {galatRiwayat}. Kemungkinan tabel kgb_riwayat belum punya policy SELECT di Supabase.
            </p>
          )}

          {memuat && <Rangka />}

          {!memuat && !galatRiwayat && tampilSelesai.length === 0 && (
            <div className="py-14 px-6 text-center">
              <span className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 grid place-items-center">
                <Icon d={IKON.selesai} className="w-6 h-6" />
              </span>
              <p className="mt-3 font-semibold text-slate-700">
                {kata || thSelesai !== 'semua' ? 'Tidak ada catatan yang cocok' : 'Belum ada KGB yang ditandai selesai'}
              </p>
              <p className="text-sm text-slate-500">
                {kata || thSelesai !== 'semua'
                  ? 'Coba ubah pencarian atau pilihan tahun.'
                  : 'Setelah SK selesai, tekan tombol Selesai di tab Jadwal KGB.'}
              </p>
            </div>
          )}

          <ul className="divide-y divide-slate-100">
            {tampilSelesai.slice(awal, awal + perHalaman).map((r) => {
              const p = petaPegawai.get(r.pegawai_id);
              return (
                <li
                  key={r.id}
                  className={`grid grid-cols-1 ${GRID_SELESAI} gap-x-4 gap-y-3 pl-4 pr-5 py-4 items-center border-l-4 border-l-emerald-400 hover:bg-slate-50/60 transition-colors`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar nama={p?.nama ?? '?'} />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{p?.nama ?? '(pegawai sudah dihapus)'}</p>
                      <p className="text-xs text-slate-500 truncate">{[p?.jabatan, p?.golongan].filter(Boolean).join(' · ') || '-'}</p>
                      <p className="text-xs text-slate-400 font-mono tabular-nums">{p?.nip ?? '-'}</p>
                    </div>
                  </div>
                  <div>
                    <Label>KGB yang diselesaikan</Label>
                    <Badge tone="hijau">{formatTanggal(r.tanggal_kgb)}</Badge>
                  </div>
                  <div>
                    <Label>Ditandai selesai pada</Label>
                    <p className="text-sm text-slate-700">{tglProses(r.diproses_at)}</p>
                  </div>
                  <div>
                    <Label>Jadwal berikutnya</Label>
                    <p className="text-sm text-slate-700">{p?.kgb_berikutnya ? formatTanggal(p.kgb_berikutnya) : '-'}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {!memuat && (
            <Paginasi
              total={tampilSelesai.length}
              satuan="catatan"
              halaman={halAman}
              perHalaman={perHalaman}
              totalHalaman={totalHalaman}
              onHalaman={setHalaman}
              onPerHalaman={setPerHalaman}
            />
          )}
        </div>
      )}

      {form && (
        <Modal title={form.data ? 'Ubah pegawai' : 'Tambah pegawai'} onClose={() => setForm(null)}>
          <PegawaiForm
            data={form.data}
            onClose={() => setForm(null)}
            onSaved={() => {
              setForm(null);
              muatUlang();
            }}
          />
        </Modal>
      )}

      {impor && (
        <Modal title="Impor dari Excel" wide onClose={() => setImpor(false)}>
          <ImportExcel onClose={() => setImpor(false)} onDone={muatUlang} />
        </Modal>
      )}

      {selesai && selesai.kgb_berikutnya && (
        <ConfirmDialog
          judul="Tandai KGB selesai?"
          pesan={
            <>
              KGB <b>{selesai.nama}</b> ({formatTanggal(selesai.kgb_berikutnya)}) ditandai selesai. Jadwal berikutnya menjadi{' '}
              <b>{formatTanggal(tambahTahun(selesai.kgb_berikutnya, 2))}</b>.
            </>
          }
          labelYa="Ya, tandai selesai"
          sedang={proses}
          galat={galatDialog}
          onYa={jalankanSelesai}
          onBatal={tutupDialog}
        />
      )}

      {hapus && (
        <ConfirmDialog
          bahaya
          judul="Hapus pegawai ini?"
          pesan={
            <>
              Data <b>{hapus.nama}</b> akan dihapus permanen dan tidak bisa dikembalikan. Kalau hanya pindah atau pensiun, lebih aman
              pakai Ubah lalu ganti Status.
            </>
          }
          labelYa="Hapus permanen"
          sedang={proses}
          galat={galatDialog}
          onYa={jalankanHapus}
          onBatal={tutupDialog}
        />
      )}
    </div>
  );
}
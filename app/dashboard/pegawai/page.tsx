'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Pegawai, dalamMasaPengurusan, formatTanggal, mulaiPengurusan, statusKgb, tambahTahun } from '@/lib/kgb';
import { Avatar, Badge, ConfirmDialog, IKON, Icon, IconButton, Modal, btnGhost, btnPrimary } from '@/components/ui';
import PegawaiForm from '@/components/PegawaiForm';
import ImportExcel from '@/components/ImportExcel';

export default function PegawaiPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat...</p>}>
      <DaftarPegawai />
    </Suspense>
  );
}

function Centang({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full ring-1 ring-inset transition ${
        value ? 'bg-sky-50 text-[var(--st-accent)] ring-sky-300' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      <span className={`w-3.5 h-3.5 rounded-full border-2 ${value ? 'border-[var(--st-accent)] bg-[var(--st-accent)]' : 'border-slate-300'}`} />
      {label}
    </button>
  );
}

function DaftarPegawai() {
  const sp = useSearchParams();
  const [rows, setRows] = useState<Pegawai[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [cari, setCari] = useState(sp.get('cari') ?? '');
  const [semua, setSemua] = useState(false);
  const [segera, setSegera] = useState(sp.get('tampil') === 'segera');
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
      const { data, error } = await supabase
        .from('pegawai')
        .select('*')
        .order('kgb_berikutnya', { ascending: true, nullsFirst: false });
      if (batal) return;
      if (error) setGalat(error.message);
      else setRows(data as Pegawai[]);
      setMemuat(false);
    };
    muat();
    return () => {
      batal = true;
    };
  }, [tick]);

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
  const tampil = rows.filter(
    (p) =>
      (semua || p.status === 'aktif') &&
      (!segera || (p.status === 'aktif' && dalamMasaPengurusan(p.kgb_berikutnya))) &&
      (!kata || p.nama.toLowerCase().includes(kata) || p.nip.includes(kata))
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data pegawai</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {memuat ? 'Memuat data...' : `${tampil.length} pegawai ditampilkan`}
          </p>
        </div>
        <button className={btnGhost} onClick={() => setImpor(true)}>
          <Icon d={IKON.impor} /> Impor Excel
        </button>
        <button className={btnPrimary} onClick={() => setForm({ data: null })}>
          <Icon d={IKON.tambah} /> Tambah pegawai
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon d={IKON.cari} className="w-[18px] h-[18px]" />
          </span>
          <input
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--st-sky)] focus:border-transparent transition"
            placeholder="Cari nama atau NIP"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </div>
        <Centang label="Perlu diproses (1 bulan sebelum)" value={segera} onChange={setSegera} />
        <Centang label="Tampilkan non-aktif" value={semua} onChange={setSemua} />
      </div>

      {galat && (
        <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-200 rounded-xl px-4 py-3">{galat}</p>
      )}

      <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-sm shadow-slate-900/[0.03] overflow-hidden">
        {/* Kepala kolom (layar lebar) */}
        <div className="hidden lg:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1fr)_128px] gap-4 px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500">
          <span>Pegawai</span>
          <span>KGB berikutnya</span>
          <span>Status</span>
          <span>Sumber</span>
          <span className="text-right">Aksi</span>
        </div>

        {memuat && <p className="p-6 text-sm text-slate-500">Memuat...</p>}

        {!memuat && tampil.length === 0 && (
          <div className="py-14 px-6 text-center">
            <span className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 grid place-items-center">
              <Icon d={IKON.kosong} className="w-6 h-6" />
            </span>
            <p className="mt-3 font-semibold text-slate-700">Tidak ada data</p>
            <p className="text-sm text-slate-500">Ubah pencarian, atau gunakan Impor Excel / Tambah pegawai.</p>
          </div>
        )}

        <ul className="divide-y divide-slate-100">
          {tampil.map((p) => {
            const s = statusKgb(p.kgb_berikutnya);
            const aktif = p.status === 'aktif';
            return (
              <li
                key={p.id}
                className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1fr)_128px] gap-x-4 gap-y-2 px-5 py-4 items-center hover:bg-slate-50/60 transition-colors"
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
                  <p className="font-semibold text-slate-800">{aktif ? formatTanggal(p.kgb_berikutnya) : '-'}</p>
                  {aktif && p.kgb_berikutnya && (
                    <p className="text-xs text-slate-500">Mulai urus {formatTanggal(mulaiPengurusan(p.kgb_berikutnya))}</p>
                  )}
                </div>

                <div>{aktif ? <Badge tone={s.nada}>{s.label}</Badge> : <Badge>{p.status}</Badge>}</div>

                <div>
                  <Badge
                    titik={false}
                    tone={p.sumber === 'pengecualian' ? 'kuning' : p.sumber === 'manual' ? 'biru' : 'hijau'}
                    title={p.alasan ?? undefined}
                  >
                    {p.sumber}
                  </Badge>
                </div>

                <div className="flex items-center justify-end gap-0.5 -mr-2">
                  {aktif && p.kgb_berikutnya && (
                    <IconButton d={IKON.selesai} label="Tandai selesai" tone="hijau" onClick={() => setSelesai(p)} />
                  )}
                  <IconButton d={IKON.ubah} label="Ubah" tone="biru" onClick={() => setForm({ data: p })} />
                  <IconButton d={IKON.hapus} label="Hapus" tone="merah" onClick={() => setHapus(p)} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

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

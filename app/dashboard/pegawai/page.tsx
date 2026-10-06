'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Pegawai, dalamMasaPengurusan, formatTanggal, mulaiPengurusan, statusKgb, tambahTahun } from '@/lib/kgb';
import { Badge, Modal, btnGhost, btnPrimary } from '@/components/ui';
import { inputClass } from '@/components/AuthShell';
import PegawaiForm from '@/components/PegawaiForm';
import ImportExcel from '@/components/ImportExcel';

export default function PegawaiPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat...</p>}>
      <DaftarPegawai />
    </Suspense>
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

  const tandaiSelesai = async (p: Pegawai) => {
    if (!p.kgb_berikutnya) return;
    const baru = tambahTahun(p.kgb_berikutnya, 2);
    const ok = window.confirm(
      `Tandai KGB ${p.nama} (${formatTanggal(p.kgb_berikutnya)}) selesai?\nJadwal berikutnya: ${formatTanggal(baru)}.`
    );
    if (!ok) return;

    const { error } = await supabase.rpc('tandai_kgb_selesai', { p_id: p.id });
    if (error) setGalat(error.message);
    else muatUlang();
  };

  const kata = cari.trim().toLowerCase();
  const tampil = rows.filter(
    (p) =>
      (semua || p.status === 'aktif') &&
      (!segera || (p.status === 'aktif' && dalamMasaPengurusan(p.kgb_berikutnya))) &&
      (!kata || p.nama.toLowerCase().includes(kata) || p.nip.includes(kata))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-slate-900 mr-auto">Data pegawai</h1>
        <input
          className={`${inputClass} !w-56`}
          placeholder="Cari nama atau NIP"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
        <label className="text-xs text-slate-600 flex items-center gap-1.5">
          <input type="checkbox" checked={segera} onChange={(e) => setSegera(e.target.checked)} />
          Perlu diproses (1 bulan sebelum)
        </label>
        <label className="text-xs text-slate-600 flex items-center gap-1.5">
          <input type="checkbox" checked={semua} onChange={(e) => setSemua(e.target.checked)} />
          Tampilkan non-aktif
        </label>
        <button className={btnGhost} onClick={() => setImpor(true)}>Impor Excel</button>
        <button className={btnPrimary} onClick={() => setForm({ data: null })}>Tambah pegawai</button>
      </div>

      {galat && <p className="text-sm text-red-600">⚠️ {galat}</p>}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="text-left p-3">Pegawai</th>
              <th className="text-left p-3">KGB berikutnya</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Sumber</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {memuat && (
              <tr><td colSpan={5} className="p-4 text-slate-500">Memuat...</td></tr>
            )}
            {!memuat && tampil.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-slate-500">Tidak ada data. Gunakan Impor Excel atau Tambah pegawai.</td></tr>
            )}
            {tampil.map((p) => {
              const s = statusKgb(p.kgb_berikutnya);
              return (
                <tr key={p.id} className="border-t border-slate-100 align-top">
                  <td className="p-3">
                    <p className="font-semibold text-slate-800">{p.nama}</p>
                    <p className="text-xs text-slate-500">{[p.jabatan, p.golongan].filter(Boolean).join(' · ')}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.nip}</p>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {p.status === 'aktif' ? formatTanggal(p.kgb_berikutnya) : '-'}
                    {p.status === 'aktif' && p.kgb_berikutnya && (
                      <span className="block text-xs text-slate-400">Mulai urus: {formatTanggal(mulaiPengurusan(p.kgb_berikutnya))}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {p.status === 'aktif' ? <Badge tone={s.nada}>{s.label}</Badge> : <Badge>{p.status}</Badge>}
                  </td>
                  <td className="p-3">
                    <Badge
                      tone={p.sumber === 'pengecualian' ? 'kuning' : p.sumber === 'manual' ? 'biru' : 'hijau'}
                      title={p.alasan ?? undefined}
                    >
                      {p.sumber}
                    </Badge>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                    {p.status === 'aktif' && p.kgb_berikutnya && (
                      <button className={btnGhost} onClick={() => tandaiSelesai(p)}>Tandai selesai</button>
                    )}
                    <button className={btnGhost} onClick={() => setForm({ data: p })}>Ubah</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
    </div>
  );
}

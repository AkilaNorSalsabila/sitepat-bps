'use client';

import React, { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Pegawai, bacaNip, cocokNip, formatBulan, formatTanggal, kgbDariNip, mulaiPengurusan } from '@/lib/kgb';
import { inputClass, labelClass } from '@/components/AuthShell';
import { AuthAlert } from '@/components/AuthShell';
import { btnGhost, btnPrimary } from '@/components/ui';

export default function PegawaiForm({
  data,
  onClose,
  onSaved,
}: {
  data: Pegawai | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const edit = !!data;

  const [nip, setNip] = useState(data?.nip ?? '');
  const [nama, setNama] = useState(data?.nama ?? '');
  const [jabatan, setJabatan] = useState(data?.jabatan ?? '');
  const [golongan, setGolongan] = useState(data?.golongan ?? '');
  const [jenis, setJenis] = useState<'pns' | 'p3k'>(data?.jenis ?? 'pns');
  const [status, setStatus] = useState<'aktif' | 'pensiun' | 'pindah'>(data?.status ?? 'aktif');
  const [tanggal, setTanggal] = useState(data?.kgb_berikutnya ?? ''); // format YYYY-MM-DD
  const [alasan, setAlasan] = useState(data?.alasan ?? '');
  const [sedang, setSedang] = useState(false);
  const [galat, setGalat] = useState('');

  const nipLengkap = /^\d{18}$/.test(nip);
  const infoNip = nipLengkap ? bacaNip(nip) : null;
  const adaBulanNip = !!infoNip?.bulanValid;
  const usulan = useMemo(() => (nipLengkap ? kgbDariNip(nip) : null), [nip, nipLengkap]);
  const iso = tanggal || null;
  const beda = adaBulanNip && !!iso && !cocokNip(nip, iso);

  const ubahNip = (v: string) => {
    const bersih = v.replace(/\D/g, '').slice(0, 18);
    setNip(bersih);
    if (edit || bersih.length !== 18) return;

    const p = bacaNip(bersih);
    if (p) setJenis(p.jenis);
    // Tanggal tidak diisi otomatis: NIP hanya memuat bulan, harinya harus dari data kepegawaian
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat('');

    if (!nipLengkap) return setGalat('NIP harus 18 digit angka.');
    if (!nama.trim()) return setGalat('Nama wajib diisi.');
    if (status === 'aktif' && !iso) return setGalat('Isi tanggal KGB berikutnya.');
    if (beda && !alasan.trim()) return setGalat('Tanggal berbeda dari hitungan NIP. Isi alasannya.');

    const payload = {
      nip,
      nama: nama.trim(),
      jabatan: jabatan.trim() || null,
      golongan: golongan.trim() || null,
      jenis,
      status,
      kgb_berikutnya: iso,
      sumber: !adaBulanNip ? 'manual' : beda ? 'pengecualian' : 'nip',
      alasan: beda || !adaBulanNip ? alasan.trim() || null : null,
    };

    setSedang(true);
    const { error } = edit
      ? await supabase.from('pegawai').update(payload).eq('id', data!.id)
      : await supabase.from('pegawai').insert(payload);
    setSedang(false);

    if (error) {
      setGalat(error.code === '23505' ? 'NIP sudah terdaftar.' : error.message);
      return;
    }
    onSaved();
  };

  return (
    <form onSubmit={simpan} className="space-y-3.5">
      {galat && <AuthAlert type="error">{galat}</AuthAlert>}

      <div className="space-y-1">
        <label htmlFor="nip" className={labelClass}>NIP (18 digit)</label>
        <input
          id="nip" inputMode="numeric" className={inputClass} value={nip}
          onChange={(e) => ubahNip(e.target.value)} disabled={edit || sedang} required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="nama" className={labelClass}>Nama</label>
        <input id="nama" className={inputClass} value={nama} onChange={(e) => setNama(e.target.value)} disabled={sedang} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="jabatan" className={labelClass}>Jabatan</label>
          <input id="jabatan" className={inputClass} value={jabatan} onChange={(e) => setJabatan(e.target.value)} disabled={sedang} />
        </div>
        <div className="space-y-1">
          <label htmlFor="golongan" className={labelClass}>Golongan ruang</label>
          <input id="golongan" className={inputClass} value={golongan} onChange={(e) => setGolongan(e.target.value)} disabled={sedang} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="jenis" className={labelClass}>Jenis pegawai</label>
          <select id="jenis" className={inputClass} value={jenis} onChange={(e) => setJenis(e.target.value as 'pns' | 'p3k')} disabled={sedang}>
            <option value="pns">PNS</option>
            <option value="p3k">P3K</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="status" className={labelClass}>Status</label>
          <select id="status" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as 'aktif' | 'pensiun' | 'pindah')} disabled={sedang}>
            <option value="aktif">Aktif</option>
            <option value="pensiun">Pensiun</option>
            <option value="pindah">Pindah</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="tanggal" className={labelClass}>Tanggal KGB berikutnya</label>
        <input id="tanggal" type="date" className={inputClass} value={tanggal} onChange={(e) => setTanggal(e.target.value)} disabled={sedang} />
        {iso && (
          <p className="text-xs text-slate-500">
            Mulai diurus: <b>{formatTanggal(mulaiPengurusan(iso))}</b> (1 bulan sebelum KGB)
          </p>
        )}
        {usulan && (
          <p className="text-xs text-slate-500">
            Usulan bulan dari NIP: <b>{formatBulan(usulan)}</b>. Tanggalnya isi sesuai data kepegawaian.{' '}
            {!iso?.startsWith(usulan.slice(0, 7)) && (
              <button type="button" className="text-[var(--st-link)] font-semibold hover:underline" onClick={() => setTanggal(usulan)}>
                pakai bulan ini
              </button>
            )}
          </p>
        )}
        {infoNip?.jenis === 'p3k' && adaBulanNip && (
          <p className="text-xs text-slate-500">P3K: bulan diambil dari NIP. Tahun dan tanggalnya sesuaikan dengan data kepegawaian.</p>
        )}
        {nipLengkap && !adaBulanNip && (
          <p className="text-xs text-slate-500">Bulan tidak terbaca dari NIP, isi tanggal manual dari data kepegawaian.</p>
        )}
      </div>

      {(beda || (nipLengkap && !adaBulanNip)) && (
        <div className="space-y-1">
          {beda && (
            <AuthAlert type="info">
              Tanggal ini berbeda dari hitungan NIP. Akan disimpan sebagai <b>pengecualian</b>.
            </AuthAlert>
          )}
          <label htmlFor="alasan" className={labelClass}>Alasan / catatan{beda ? ' (wajib)' : ''}</label>
          <textarea id="alasan" rows={2} className={inputClass} value={alasan} onChange={(e) => setAlasan(e.target.value)} disabled={sedang} />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className={btnGhost} disabled={sedang}>Batal</button>
        <button type="submit" className={btnPrimary} disabled={sedang}>{sedang ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>
  );
}

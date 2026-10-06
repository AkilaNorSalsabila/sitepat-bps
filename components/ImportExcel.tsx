'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarisImpor, bacaExcel } from '@/lib/impor';
import { formatTanggal } from '@/lib/kgb';
import { AuthAlert } from '@/components/AuthShell';
import { Badge, btnGhost, btnPrimary } from '@/components/ui';

export default function ImportExcel({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [baris, setBaris] = useState<BarisImpor[] | null>(null);
  const [galat, setGalat] = useState('');
  const [hasil, setHasil] = useState('');
  const [sedang, setSedang] = useState(false);

  const pilihFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGalat('');
    setHasil('');
    setBaris(null);

    try {
      const { baris: dibaca, galat: g } = bacaExcel(await file.arrayBuffer());
      if (g) return setGalat(g);

      // Tandai NIP yang sudah ada di database, supaya tidak ditimpa
      const { data: ada } = await supabase.from('pegawai').select('nip');
      const nipAda = new Set((ada ?? []).map((a) => a.nip));
      setBaris(dibaca.map((b) => ({ ...b, ada: nipAda.has(b.nip) })));
    } catch {
      setGalat('File tidak bisa dibaca. Pastikan formatnya .xlsx.');
    }
  };

  const siap = (baris ?? []).filter((b) => !b.error && !b.ada);
  const dilewati = (baris ?? []).filter((b) => b.ada).length;
  const bermasalah = (baris ?? []).filter((b) => b.error).length;

  const simpan = async () => {
    setSedang(true);
    setGalat('');

    const rows = siap.map((b) => ({
      nip: b.nip, nama: b.nama, jabatan: b.jabatan, golongan: b.golongan, jenis: b.jenis,
      status: b.status, kgb_berikutnya: b.kgb_berikutnya, sumber: b.sumber, alasan: b.alasan,
    }));

    // ignoreDuplicates: NIP yang sudah ada tidak pernah ditimpa
    const { error } = await supabase.from('pegawai').upsert(rows, { onConflict: 'nip', ignoreDuplicates: true });
    setSedang(false);

    if (error) return setGalat(error.message);
    setHasil(`${rows.length} pegawai berhasil diimpor.`);
    setBaris(null);
    onDone();
  };

  return (
    <div className="space-y-4">
      <AuthAlert type="info">
        Impor dipakai untuk memasukkan data awal. NIP yang sudah ada di sistem dilewati dan tidak pernah ditimpa.
      </AuthAlert>

      <input type="file" accept=".xlsx" onChange={pilihFile} className="text-sm" />

      {galat && <AuthAlert type="error">{galat}</AuthAlert>}
      {hasil && <AuthAlert type="success">{hasil}</AuthAlert>}

      {baris && (
        <>
          <p className="text-sm text-slate-700">
            <b>{siap.length}</b> siap diimpor
            {dilewati > 0 && <>, {dilewati} sudah ada (dilewati)</>}
            {bermasalah > 0 && <>, <span className="text-red-600">{bermasalah} bermasalah</span></>}.{' '}
            {siap.filter((b) => b.sumber === 'pengecualian').length} pengecualian NIP.
          </p>

          <div className="overflow-auto max-h-72 border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="text-left p-2">Nama</th>
                  <th className="text-left p-2">KGB berikutnya</th>
                  <th className="text-left p-2">Sumber</th>
                  <th className="text-left p-2">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr key={b.nip} className={`border-t border-slate-100 ${b.ada ? 'opacity-50' : ''}`}>
                    <td className="p-2">{b.nama}</td>
                    <td className="p-2 whitespace-nowrap">{b.status === 'pensiun' ? 'Pensiun' : formatTanggal(b.kgb_berikutnya)}</td>
                    <td className="p-2">
                      <Badge tone={b.sumber === 'pengecualian' ? 'kuning' : b.sumber === 'manual' ? 'biru' : 'hijau'}>{b.sumber}</Badge>
                    </td>
                    <td className="p-2 text-slate-500">
                      {b.error ? <span className="text-red-600">{b.error}</span> : b.ada ? 'Sudah ada' : b.catatan.join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>Tutup</button>
        <button onClick={simpan} className={btnPrimary} disabled={sedang || siap.length === 0}>
          {sedang ? 'Menyimpan...' : `Impor ${siap.length} pegawai`}
        </button>
      </div>
    </div>
  );
}

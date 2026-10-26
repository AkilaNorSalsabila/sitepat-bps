'use client';

import React from 'react';
import * as XLSX from 'xlsx';
import { btnGhost } from '@/components/ui';

/* Membuat file template .xlsx di browser (tanpa file statis).
   Sheet pertama = tempat mengisi data (satu-satunya yang dibaca saat impor).
   Sheet kedua  = petunjuk, tidak ikut dibaca. */
export function unduhTemplate() {
  const th = Number(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).slice(0, 4));
  const kolomKgb = [th, th + 1, th + 2].map((t) => `KGB Tahun ${t}`);
  const kepala = ['No', 'Nama', 'Jabatan', 'Golongan Ruang', 'NIP', ...kolomKgb];

  // Sel NIP dibuat bertipe teks supaya Excel tidak memotong 18 digitnya
  const nipKosong = (): XLSX.CellObject => ({ t: 's', v: '', z: '@' });

  const data: (string | null | XLSX.CellObject)[][] = [['DAFTAR PEGAWAI (ganti dengan nama satuan kerja)'], [], kepala];
  for (let i = 0; i < 150; i++) data.push([null, null, null, null, nipKosong(), null, null, null]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: kepala.length - 1 } }];
  ws['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 34 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

  const petunjuk = [
    ['PETUNJUK PENGISIAN'],
    [],
    ['1. Isi data mulai baris di bawah judul kolom (Nama, Jabatan, Golongan Ruang, NIP, KGB Tahun ...).'],
    ['2. Kolom wajib: Nama, NIP, dan minimal satu kolom yang judulnya diawali "KGB". Jabatan dan Golongan boleh kosong.'],
    ['3. NIP harus 18 digit dan bertipe teks. Kolom NIP di template ini sudah diatur sebagai teks.'],
    ['4. Setiap pegawai harus punya satu tanggal KGB atau tulisan "Pensiun ...". Kolom tahun yang tidak dipakai isi dengan tanda "-" atau kosongkan.'],
    ['5. Kalau lebih dari satu kolom KGB terisi, yang dipakai adalah kolom paling kiri.'],
    [],
    ['FORMAT TANGGAL YANG DIKENALI'],
    ['   5 November 2026   |   05/11/2026   |   2026-11-05   |   sel tanggal Excel'],
    ['   November 2026 (hanya bulan dan tahun) -> otomatis memakai tanggal 1, sesuaikan nanti lewat tombol Ubah'],
    ['   Nama bulan memakai bahasa Indonesia (Januari, Februari, Maret, ... Desember)'],
    [],
    ['PENSIUN'],
    ['   Tulis di kolom KGB, contoh: Pensiun 1 April 2027. Pegawai disimpan berstatus pensiun dan tidak mendapat pengingat.'],
    [],
    ['CATATAN'],
    ['   - Tanggal KGB yang sudah lewat otomatis digeser maju per 2 tahun sampai tanggal yang belum lewat.'],
    ['   - Warna sel (misalnya hijau) tidak dibaca saat impor.'],
    ['   - Hanya sheet pertama ("Pegawai") yang dibaca.'],
    ['   - Baris tanpa NIP dilewati.'],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(petunjuk);
  wsInfo['!cols'] = [{ wch: 120 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pegawai');
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Petunjuk');
  XLSX.writeFile(wb, 'template-impor-pegawai.xlsx');
}

function Item({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-700">{judul}</p>
      <div className="mt-1 text-xs text-slate-600 leading-relaxed">{children}</div>
    </div>
  );
}

const kode = 'px-1.5 py-0.5 rounded bg-white ring-1 ring-inset ring-slate-200 font-mono text-[11px] text-slate-700';

export default function PanduanImpor({ terbuka = true }: { terbuka?: boolean }) {
  return (
    <details open={terbuka} className="group rounded-2xl bg-sky-50/60 ring-1 ring-inset ring-sky-200">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
        <span className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 grid place-items-center font-bold">i</span>
        <span className="mr-auto">
          <span className="block text-sm font-bold text-slate-800">Format file Excel yang benar</span>
          <span className="block text-xs text-slate-500">Cek dulu supaya tidak ada data yang gagal atau tidak lengkap</span>
        </span>
        <span className="text-slate-400 text-xs transition group-open:rotate-180">▾</span>
      </summary>

      <div className="px-4 pb-4 pt-1 space-y-4 border-t border-sky-200/70">
        <div className="grid sm:grid-cols-2 gap-4 pt-3">
          <Item judul="Kolom yang dibutuhkan">
            <ul className="space-y-1">
              <li>
                <b>Nama</b>, <b>NIP</b>, dan minimal satu kolom <span className={kode}>KGB Tahun ...</span> <span className="text-red-600">(wajib)</span>
              </li>
              <li>
                Jabatan dan Golongan Ruang <span className="text-slate-400">(boleh kosong)</span>
              </li>
              <li>Judul kolom boleh tidak di baris pertama, asal ada kolom bertuliskan NIP</li>
            </ul>
          </Item>

          <Item judul="NIP">
            <ul className="space-y-1">
              <li>Harus <b>18 digit</b></li>
              <li>
                Kolom NIP harus berformat <b>Teks</b>. Kalau berformat angka, Excel memotong digit terakhir dan baris ditolak
              </li>
            </ul>
          </Item>

          <Item judul="Isi kolom KGB">
            <ul className="space-y-1">
              <li>
                <span className={kode}>5 November 2026</span> <span className={kode}>05/11/2026</span> <span className={kode}>2026-11-05</span>
              </li>
              <li>
                <span className={kode}>November 2026</span> (tanpa tanggal) dipakai tanggal 1, bisa diubah nanti
              </li>
              <li>
                <span className={kode}>Pensiun 1 April 2027</span> disimpan sebagai pensiun, tanpa pengingat
              </li>
              <li>
                Tahun yang tidak dipakai isi <span className={kode}>-</span> atau kosongkan
              </li>
            </ul>
          </Item>

          <Item judul="Perlu diketahui">
            <ul className="space-y-1">
              <li>Setiap pegawai harus punya satu tanggal KGB atau tulisan Pensiun</li>
              <li>Kalau beberapa kolom KGB terisi, yang dipakai kolom paling kiri</li>
              <li>Tanggal yang sudah lewat digeser maju per 2 tahun otomatis</li>
              <li>Warna sel tidak dibaca. Hanya sheet pertama yang dibaca</li>
            </ul>
          </Item>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" className={btnGhost} onClick={unduhTemplate}>
            Unduh template Excel
          </button>
          <span className="text-xs text-slate-500">Template sudah berisi kolom NIP bertipe teks dan sheet petunjuk.</span>
        </div>
      </div>
    </details>
  );
}

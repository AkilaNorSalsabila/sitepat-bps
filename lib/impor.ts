import * as XLSX from 'xlsx';
import { BULAN, bacaNip, cocokNip, formatTanggal, geserSampaiBerjalan } from './kgb';

export type BarisImpor = {
  nip: string;
  nama: string;
  jabatan: string | null;
  golongan: string | null;
  jenis: 'pns' | 'p3k';
  status: 'aktif' | 'pensiun';
  kgb_berikutnya: string | null;
  sumber: 'nip' | 'pengecualian' | 'manual';
  alasan: string | null;
  catatan: string[];
  error?: string;
  ada?: boolean; // NIP sudah ada di database, akan dilewati
};

const teks = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

const NAMA_BULAN = BULAN.map((b) => b.toLowerCase());
const p2 = (n: number) => String(n).padStart(2, '0');

function susun(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null;
  return `${y}-${p2(m)}-${p2(d)}`;
}

// Membaca tanggal KGB dari sel Excel. "lengkap" = ada tanggalnya; kalau hanya bulan dan tahun, dipakai tanggal 1.
// Format yang dikenali: sel tanggal Excel, 2026-11-05, 05/11/2026, 5 November 2026, November 2026.
function bacaTanggal(v: unknown): { iso: string; lengkap: boolean } | null {
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000)); // nomor seri Excel
    return { iso: d.toISOString().slice(0, 10), lengkap: true };
  }
  const t = teks(v).toLowerCase();
  let m: RegExpMatchArray | null;

  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
    const iso = susun(+m[1], +m[2], +m[3]);
    return iso ? { iso, lengkap: true } : null;
  }
  if ((m = t.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/))) {
    const iso = susun(+m[3], +m[2], +m[1]);
    return iso ? { iso, lengkap: true } : null;
  }
  if ((m = t.match(new RegExp(`(\\d{1,2})\\s+(${NAMA_BULAN.join('|')})\\s+(\\d{4})`)))) {
    const iso = susun(+m[3], NAMA_BULAN.indexOf(m[2]) + 1, +m[1]);
    return iso ? { iso, lengkap: true } : null;
  }
  if ((m = t.match(new RegExp(`(${NAMA_BULAN.join('|')})\\s+(\\d{4})`)))) {
    return { iso: `${m[2]}-${p2(NAMA_BULAN.indexOf(m[1]) + 1)}-01`, lengkap: false };
  }
  return null;
}

export function bacaExcel(buffer: ArrayBuffer, now = new Date()): { baris: BarisImpor[]; galat: string | null } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });

  const hIdx = aoa.findIndex((r) => r.some((c) => teks(c).toLowerCase() === 'nip'));
  if (hIdx < 0) return { baris: [], galat: 'Baris judul kolom (Nama, NIP, KGB ...) tidak ditemukan.' };

  const head = aoa[hIdx].map((c) => teks(c).toLowerCase());
  const cNama = head.indexOf('nama');
  const cJab = head.indexOf('jabatan');
  const cGol = head.findIndex((h) => h.startsWith('golongan'));
  const cNip = head.indexOf('nip');
  const cKgb = head.map((h, i) => (h.startsWith('kgb') ? i : -1)).filter((i) => i >= 0);

  if (cNama < 0 || cNip < 0 || cKgb.length === 0) {
    return { baris: [], galat: 'Kolom Nama, NIP, dan KGB tidak lengkap di baris judul.' };
  }

  const baris: BarisImpor[] = [];

  for (const r of aoa.slice(hIdx + 1)) {
    const rawNip = r[cNip];
    if (rawNip === null || rawNip === '') continue;

    const nama = teks(r[cNama]);
    const jabatan = teks(r[cJab]) || null;
    const golongan = teks(r[cGol]) || null;
    const dasar = { nama, jabatan, golongan };

    // NIP yang tersimpan sebagai angka di Excel kehilangan digit terakhir
    if (typeof rawNip === 'number' && rawNip > 1e14) {
      baris.push({
        ...dasar, nip: String(rawNip), jenis: 'pns', status: 'aktif', kgb_berikutnya: null,
        sumber: 'nip', alasan: null, catatan: [],
        error: 'NIP tersimpan sebagai angka. Ubah kolom NIP menjadi teks di Excel.',
      });
      continue;
    }

    const nip = teks(rawNip).replace(/\s/g, '');

    if (!/^\d{18}$/.test(nip)) {
      if (nip.length >= 10) {
        baris.push({
          ...dasar, nip, jenis: 'pns', status: 'aktif', kgb_berikutnya: null,
          sumber: 'nip', alasan: null, catatan: [], error: 'NIP harus 18 digit.',
        });
      }
      continue; // baris penomoran kolom atau baris kosong
    }

    const kgbRaw = cKgb.map((i) => r[i]).find((v) => teks(v) && teks(v) !== '-');
    const kgbTeks = teks(kgbRaw);
    const p = bacaNip(nip);
    const p3k = p?.jenis === 'p3k' || /p3k/i.test(jabatan ?? '');
    const bulanDariNip = !!p?.bulanValid;
    const catatan: string[] = [];

    const baru: BarisImpor = {
      ...dasar, nip, jenis: p3k ? 'p3k' : 'pns', status: 'aktif',
      kgb_berikutnya: null, sumber: bulanDariNip ? 'nip' : 'manual', alasan: null, catatan,
    };

    if (/^pensiun/i.test(kgbTeks)) {
      baru.status = 'pensiun';
      baru.alasan = kgbTeks;
      catatan.push('Pensiun, tidak ada pengingat');
      baris.push(baru);
      continue;
    }

    const baca = bacaTanggal(kgbRaw);
    if (!baca) {
      baru.error = 'Tanggal KGB tidak terbaca (contoh: "5 November 2026" atau "05/11/2026").';
      baris.push(baru);
      continue;
    }
    const asli = baca.iso;
    if (!baca.lengkap) catatan.push('Excel hanya berisi bulan, dipakai tanggal 1. Sesuaikan tanggalnya lewat tombol Ubah');

    const iso = geserSampaiBerjalan(asli, now);
    if (iso !== asli) catatan.push(`Excel: ${formatTanggal(asli)}, sudah lewat, digeser ke ${formatTanggal(iso)}`);
    baru.kgb_berikutnya = iso;

    if (!bulanDariNip) {
      catatan.push('Bulan tidak terbaca dari NIP, tanggal manual dari Excel');
    } else if (!cocokNip(nip, iso)) {
      baru.sumber = 'pengecualian';
      baru.alasan = 'Sesuai data Excel awal, berbeda dari hitungan NIP.';
      catatan.push('Berbeda dari hitungan NIP');
    } else if (p3k) {
      catatan.push('P3K: bulan sesuai NIP, tahun dari Excel');
    }

    baris.push(baru);
  }

  return { baris, galat: baris.length === 0 ? 'Tidak ada baris pegawai yang terbaca.' : null };
}

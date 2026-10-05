import * as XLSX from 'xlsx';
import { BULAN, bacaNip, cocokNip, formatBulan, geserSampaiBerjalan, isoBulan } from './kgb';

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

function bacaBulanTahun(t: string): string | null {
  const pola = new RegExp(`(${BULAN.map((b) => b.toLowerCase()).join('|')})\\s+(\\d{4})`);
  const m = t.toLowerCase().match(pola);
  if (!m) return null;
  return isoBulan(Number(m[2]), BULAN.findIndex((b) => b.toLowerCase() === m[1]) + 1);
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

    const kgbTeks = cKgb.map((i) => teks(r[i])).find((t) => t && t !== '-') ?? '';
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

    const asli = bacaBulanTahun(kgbTeks);
    if (!asli) {
      baru.error = 'Tanggal KGB tidak terbaca (harus seperti "Desember 2026").';
      baris.push(baru);
      continue;
    }

    const iso = geserSampaiBerjalan(asli, now);
    if (iso !== asli) catatan.push(`Excel: ${formatBulan(asli)}, sudah lewat, digeser ke ${formatBulan(iso)}`);
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

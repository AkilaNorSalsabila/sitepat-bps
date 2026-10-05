// Semua aturan perhitungan KGB ada di sini.
// Tanggal disimpan sebagai teks "YYYY-MM-01" (selalu tanggal 1) supaya bebas masalah zona waktu.

export type Pegawai = {
  id: string;
  nip: string;
  nama: string;
  jabatan: string | null;
  golongan: string | null;
  jenis: 'pns' | 'p3k';
  status: 'aktif' | 'pensiun' | 'pindah';
  kgb_berikutnya: string | null;
  sumber: 'nip' | 'pengecualian' | 'manual';
  alasan: string | null;
};

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const pad = (n: number) => String(n).padStart(2, '0');

export const isoBulan = (tahun: number, bulan: number) => `${tahun}-${pad(bulan)}-01`;

export function formatBulan(iso: string | null): string {
  if (!iso) return '-';
  const [y, m] = iso.split('-').map(Number);
  return `${BULAN[m - 1]} ${y}`;
}

export const awalBulanIni = (now = new Date()) => isoBulan(now.getFullYear(), now.getMonth() + 1);

export function tambahTahun(iso: string, n: number): string {
  const [y, m] = iso.split('-').map(Number);
  return isoBulan(y + n, m);
}

// Tanggal yang sudah lewat dianggap sudah diproses: geser +2 tahun sampai bulan ini atau sesudahnya.
export function geserSampaiBerjalan(iso: string, now = new Date()): string {
  const batas = awalBulanIni(now);
  let hasil = iso;
  while (hasil < batas) hasil = tambahTahun(hasil, 2);
  return hasil;
}

// NIP PNS : 8 digit lahir + 6 digit TMT (tahun+bulan) + 1 digit jenis kelamin + 3 digit urut
// NIP P3K : 8 digit lahir + 4 digit tahun TMT + "21" + 2 digit bulan TMT + 2 digit urut
export function bacaNip(nip: string) {
  if (!/^\d{18}$/.test(nip)) return null;
  const tmtTahun = Number(nip.slice(8, 12));
  const bulanPns = Number(nip.slice(12, 14));

  if (bulanPns >= 1 && bulanPns <= 12) {
    return { jenis: 'pns' as const, tmtTahun, tmtBulan: bulanPns, bulanValid: true };
  }

  const bulanP3k = Number(nip.slice(14, 16));
  if (nip.slice(12, 14) === '21' && bulanP3k >= 1 && bulanP3k <= 12) {
    return { jenis: 'p3k' as const, tmtTahun, tmtBulan: bulanP3k, bulanValid: true };
  }

  return { jenis: 'p3k' as const, tmtTahun, tmtBulan: 0, bulanValid: false };
}

// Usulan jadwal dari NIP.
// PNS: bulan TMT, berulang tiap 2 tahun, ambil yang terdekat (bulan ini atau sesudahnya).
// P3K: bulan TMT saja (tahunnya mengikuti data kepegawaian), ambil bulan itu yang terdekat.
export function kgbDariNip(nip: string, now = new Date()): string | null {
  const p = bacaNip(nip);
  if (!p || !p.bulanValid) return null;

  if (p.jenis === 'p3k') {
    const tahunIni = isoBulan(now.getFullYear(), p.tmtBulan);
    return tahunIni < awalBulanIni(now) ? tambahTahun(tahunIni, 1) : tahunIni;
  }

  return geserSampaiBerjalan(isoBulan(p.tmtTahun + 2, p.tmtBulan), now);
}

// Apakah tanggal ini sesuai NIP?
// PNS: bulan sama dan selisih tahun dari TMT genap. P3K: cukup bulannya sama.
export function cocokNip(nip: string, iso: string): boolean {
  const p = bacaNip(nip);
  if (!p || !p.bulanValid) return false;
  const [y, m] = iso.split('-').map(Number);
  if (p.jenis === 'p3k') return m === p.tmtBulan;
  return m === p.tmtBulan && y > p.tmtTahun && (y - p.tmtTahun) % 2 === 0;
}

export function selisihHari(iso: string, hariIniIso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const [a, b, c] = hariIniIso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(a, b - 1, c)) / 86400000);
}

export const hariIniLokal = (now = new Date()) =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

// Untuk server (Vercel berjalan di UTC): ambil tanggal hari ini menurut WIB
export const hariIniWIB = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

export type NadaStatus = 'merah' | 'kuning' | 'hijau' | 'abu';

export function statusKgb(
  iso: string | null,
  now = new Date()
): { label: string; nada: NadaStatus; hari: number | null } {
  if (!iso) return { label: 'Tidak ada jadwal', nada: 'abu', hari: null };

  const hari = selisihHari(iso, hariIniLokal(now));
  const [y, m] = iso.split('-').map(Number);
  const selisihBulan = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth());

  if (selisihBulan < 0) return { label: 'Terlambat', nada: 'merah', hari };
  if (selisihBulan === 0) return { label: 'Bulan ini', nada: 'merah', hari };
  if (hari <= 30) return { label: `H-${hari}`, nada: 'kuning', hari };
  return { label: 'Aman', nada: 'hijau', hari };
}

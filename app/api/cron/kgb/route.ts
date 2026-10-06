import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminFromRequest } from '@/lib/server-auth';
import { kirimPush } from '@/lib/push';
import { emailSiap, esc, kirimEmail } from '@/lib/mailer';
import { dalamMasaPengurusan, formatTanggal, hariIniWIB, selisihHari } from '@/lib/kgb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Pengingat aktif mulai 1 bulan sebelum KGB (lihat mulaiPengurusan di lib/kgb.ts), dikirim pada jam-jam JADWAL_JAM (WIB) setiap hari,
// sampai admin menekan "Tandai selesai" (jadwal pindah 2 tahun ke depan, pengingat berhenti).
const JADWAL_JAM = [8, 9, 11, 15];

type Item = {
  pegawai_id: string;
  nama: string;
  nip: string;
  jabatan: string | null;
  golongan: string | null;
  kgb: string;
  hari: number;
};

const pad = (n: number) => String(n).padStart(2, '0');
const jamWIB = () => Number(new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(11, 13));

const keterangan = (hari: number) =>
  hari < 0 ? `terlambat ${-hari} hari` : hari === 0 ? 'jatuh tempo hari ini' : `sisa ${hari} hari`;

function infoBerikutnya(jam: number) {
  const berikut = JADWAL_JAM.find((j) => j > jam);
  return berikut !== undefined ? `hari ini ${pad(berikut)}.00 WIB` : `besok ${pad(JADWAL_JAM[0])}.00 WIB`;
}

function ringkasan(a: Item[]) {
  const terlambat = a.filter((i) => i.hari < 0).length;
  const mendesak = a.filter((i) => i.hari >= 0 && i.hari <= 7).length;
  const lain = a.length - terlambat - mendesak;
  return [
    terlambat > 0 ? `${terlambat} terlambat` : '',
    mendesak > 0 ? `${mendesak} dalam 7 hari` : '',
    lain > 0 ? `${lain} masa pengurusan` : '',
  ]
    .filter(Boolean)
    .join(', ');
}

export async function GET(req: Request) {
  // Boleh dipanggil oleh scheduler (CRON_SECRET) atau admin yang sedang login (untuk simulasi)
  const secret = process.env.CRON_SECRET;
  const dariCron = !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
  if (!dariCron && !(await getAdminFromRequest(req))) {
    return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
  }

  const simulasi = new URL(req.url).searchParams.get('dry') === '1';
  const hariIni = hariIniWIB();
  const jam = jamWIB();

  // Slot = jam pengingat terakhir yang sudah lewat. Pemanggilan yang terlambat tetap masuk slot yang benar,
  // dan pemanggilan ganda pada slot yang sama tidak mengirim ulang.
  const slotJam = [...JADWAL_JAM].reverse().find((j) => j <= jam);
  const slotKey = slotJam === undefined ? null : `${hariIni}|${pad(slotJam)}`;
  const slotEmail = `${hariIni}|email`;

  const { data: pegawai, error } = await supabaseAdmin
    .from('pegawai')
    .select('id, nama, nip, jabatan, golongan, kgb_berikutnya')
    .eq('status', 'aktif')
    .not('kgb_berikutnya', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Semua pegawai yang sedang dalam masa pengurusan (sudah 1 bulan sebelum KGB, atau terlambat)
  const daftar: Item[] = [];
  for (const p of pegawai ?? []) {
    const kgb = p.kgb_berikutnya as string;
    const hari = selisihHari(kgb, hariIni);
    if (dalamMasaPengurusan(kgb, hariIni)) {
      daftar.push({ pegawai_id: p.id, nama: p.nama, nip: p.nip, jabatan: p.jabatan, golongan: p.golongan, kgb, hari });
    }
  }
  daftar.sort((a, b) => a.hari - b.hari);

  const ambilSudah = async (slot: string) => {
    const { data } = await supabaseAdmin.from('pengingat_log').select('pegawai_id, tanggal_kgb').eq('slot', slot);
    return new Set((data ?? []).map((l) => `${l.pegawai_id}|${l.tanggal_kgb}`));
  };

  const sudahPush = slotKey ? await ambilSudah(slotKey) : new Set<string>();
  const sudahEmail = await ambilSudah(slotEmail);

  const antrean = daftar.filter((i) => !sudahPush.has(`${i.pegawai_id}|${i.kgb}`));
  const antreanEmail = emailSiap() ? daftar.filter((i) => !sudahEmail.has(`${i.pegawai_id}|${i.kgb}`)) : [];

  const dasar = { simulasi, hariIni, berikutnya: infoBerikutnya(jam), daftar, antrean };

  if (simulasi) return NextResponse.json({ ...dasar, terkirim: 0 });
  if (!slotKey) return NextResponse.json({ ...dasar, antrean: [], terkirim: 0, catatan: ['Belum jam pengingat (mulai 08.00 WIB)'] });
  if (antrean.length === 0 && antreanEmail.length === 0) return NextResponse.json({ ...dasar, terkirim: 0 });

  // Penerima: semua admin yang akunnya masih approved
  const { data: admin } = await supabaseAdmin.from('profiles').select('id, email').eq('status', 'approved');
  const idAktif = (admin ?? []).map((a) => a.id);
  const emailAktif = (admin ?? []).map((a) => a.email).filter(Boolean) as string[];

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .in('user_id', idAktif);

  const catatan: string[] = [];
  let push = { berhasil: 0, gagal: 0 };
  let emailTerkirim = 0;

  // 1. Push notification: satu notifikasi gabungan per perangkat, tiap slot
  if (antrean.length > 0) {
    if (subs && subs.length > 0) {
      const satu = antrean.length === 1;
      const a0 = antrean[0];
      const daftarTeks = antrean.slice(0, 4).map((a) => `• ${a.nama}: ${formatTanggal(a.kgb)} (${keterangan(a.hari)})`);
      const sisa = antrean.length - daftarTeks.length;

      const baris = satu
        ? [
            `KGB ${formatTanggal(a0.kgb)}, ${keterangan(a0.hari)}.`,
            [a0.jabatan, a0.golongan ? `Gol. ${a0.golongan}` : ''].filter(Boolean).join(', '),
          ]
        : [ringkasan(antrean), ...daftarTeks, sisa > 0 ? `dan ${sisa} pegawai lainnya` : ''];

      try {
        push = await kirimPush(subs, {
          title: satu ? `Pengingat KGB: ${a0.nama}` : `Pengingat KGB: ${antrean.length} pegawai`,
          body: [...baris, 'Siapkan SK KGB, lalu tekan "Tandai selesai" agar pengingat berhenti.'].filter(Boolean).join('\n'),
          url: satu ? `/dashboard/pegawai?cari=${encodeURIComponent(a0.nip)}` : '/dashboard/pegawai?tampil=segera',
          tag: 'kgb-harian',
        });
      } catch (e) {
        catatan.push(`Push gagal: ${e instanceof Error ? e.message : 'kesalahan tidak dikenal'}`);
      }
    } else {
      catatan.push('Belum ada perangkat yang mengaktifkan notifikasi');
    }
  }

  // 2. Email: cukup sekali sehari untuk tiap pegawai (bukan tiap slot), supaya kotak masuk tidak penuh
  if (antreanEmail.length > 0 && emailAktif.length > 0) {
    const appUrl = process.env.APP_URL?.replace(/\/$/, '');
    const tautan = appUrl ? `${appUrl}/dashboard/pegawai?tampil=segera` : '';
    const terlambat = antreanEmail.filter((i) => i.hari < 0).length;

    const teks =
      `Pengingat KGB SiTepat\n${ringkasan(antreanEmail)}\n\n` +
      antreanEmail.map((a) => `- ${a.nama} (${a.nip}): KGB ${formatTanggal(a.kgb)}, ${keterangan(a.hari)}`).join('\n') +
      `\n\nSiapkan SK KGB, lalu tekan "Tandai selesai" di aplikasi agar pengingat berhenti.` +
      (tautan ? `\n${tautan}` : '');

    const sel = 'padding:6px 10px;border:1px solid #e2e8f0;text-align:left;';
    const html =
      `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a">` +
      `<p><b>Pengingat KGB SiTepat</b><br>${esc(ringkasan(antreanEmail))}</p>` +
      `<table style="border-collapse:collapse"><tr style="background:#f1f5f9"><th style="${sel}">Pegawai</th><th style="${sel}">KGB</th><th style="${sel}">Status</th></tr>` +
      antreanEmail
        .map(
          (a) =>
            `<tr><td style="${sel}">${esc(a.nama)}<br><span style="color:#64748b;font-size:12px">${esc(a.nip)}${
              a.jabatan ? ' · ' + esc(a.jabatan) : ''
            }</span></td><td style="${sel}">${formatTanggal(a.kgb)}</td><td style="${sel}color:${
              a.hari < 0 ? '#dc2626' : '#b45309'
            };font-weight:bold">${keterangan(a.hari)}</td></tr>`
        )
        .join('') +
      `</table><p>Siapkan SK KGB, lalu tekan <b>Tandai selesai</b> di aplikasi agar pengingat berhenti.</p>` +
      (tautan ? `<p><a href="${esc(tautan)}">Buka SiTepat</a></p>` : '') +
      `</div>`;

    try {
      await kirimEmail(
        emailAktif,
        `Pengingat KGB: ${antreanEmail.length} pegawai${terlambat > 0 ? ` (${terlambat} terlambat)` : ''}`,
        teks,
        html
      );
      emailTerkirim = emailAktif.length;
    } catch (e) {
      catatan.push(`Email gagal: ${e instanceof Error ? e.message : 'kesalahan tidak dikenal'}`);
    }
  } else if (!emailSiap()) {
    catatan.push('Email belum disetel');
  }

  // Catat ke log hanya yang benar-benar terkirim. Kalau gagal, slot berikutnya mencoba lagi.
  const log: { pegawai_id: string; tanggal_kgb: string; tahap: number; slot: string }[] = [];
  if (push.berhasil > 0) {
    antrean.forEach((a) => log.push({ pegawai_id: a.pegawai_id, tanggal_kgb: a.kgb, tahap: a.hari, slot: slotKey }));
  }
  if (emailTerkirim > 0) {
    antreanEmail.forEach((a) => log.push({ pegawai_id: a.pegawai_id, tanggal_kgb: a.kgb, tahap: a.hari, slot: slotEmail }));
  }
  if (log.length > 0) {
    await supabaseAdmin.from('pengingat_log').upsert(log, { onConflict: 'pegawai_id,tanggal_kgb,slot', ignoreDuplicates: true });
  }

  return NextResponse.json({ ...dasar, terkirim: push.berhasil, email: emailTerkirim, catatan });
}

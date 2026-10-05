import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminFromRequest } from '@/lib/server-auth';
import { kirimPush } from '@/lib/push';
import { emailSiap, esc, kirimEmail } from '@/lib/mailer';
import { formatBulan, hariIniWIB, selisihHari } from '@/lib/kgb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Pegawai mulai diingatkan saat sisa hari <= BATAS_HARI, lalu diulang tiap ULANG_HARI hari.
// Pengingat berhenti setelah admin menekan "Tandai selesai" (jadwal pindah 2 tahun ke depan).
const BATAS_HARI = 30;
const ULANG_HARI = 2;

const tglWIB = (waktu: string) => new Date(new Date(waktu).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);

const keterangan = (hari: number) =>
  hari < 0 ? `terlambat ${-hari} hari` : hari === 0 ? 'jatuh tempo hari ini' : `sisa ${hari} hari`;

export async function GET(req: Request) {
  // Boleh dipanggil oleh scheduler (CRON_SECRET) atau admin yang sedang login (untuk simulasi)
  const secret = process.env.CRON_SECRET;
  const dariCron = !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
  if (!dariCron && !(await getAdminFromRequest(req))) {
    return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
  }

  const simulasi = new URL(req.url).searchParams.get('dry') === '1';
  const hariIni = hariIniWIB();

  const { data: pegawai, error } = await supabaseAdmin
    .from('pegawai')
    .select('id, nama, kgb_berikutnya')
    .eq('status', 'aktif')
    .not('kgb_berikutnya', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Kapan terakhir pengingat dikirim untuk tiap jadwal (cukup lihat beberapa hari terakhir)
  const sejak = new Date(Date.now() - (ULANG_HARI + 1) * 86400000).toISOString();
  const { data: log } = await supabaseAdmin
    .from('pengingat_log')
    .select('pegawai_id, tanggal_kgb, dikirim_at')
    .gte('dikirim_at', sejak);

  const terakhir = new Map<string, string>();
  for (const l of log ?? []) {
    const kunci = `${l.pegawai_id}|${l.tanggal_kgb}`;
    const tgl = tglWIB(l.dikirim_at);
    if (!terakhir.has(kunci) || tgl > (terakhir.get(kunci) as string)) terakhir.set(kunci, tgl);
  }

  const antrean: { pegawai_id: string; nama: string; kgb: string; hari: number }[] = [];

  for (const p of pegawai ?? []) {
    const kgb = p.kgb_berikutnya as string;
    const hari = selisihHari(kgb, hariIni);
    if (hari > BATAS_HARI) continue; // belum waktunya

    const lalu = terakhir.get(`${p.id}|${kgb}`);
    if (lalu && selisihHari(hariIni, lalu) < ULANG_HARI) continue; // baru saja diingatkan

    antrean.push({ pegawai_id: p.id, nama: p.nama, kgb, hari });
  }

  antrean.sort((a, b) => a.hari - b.hari);

  if (antrean.length === 0) return NextResponse.json({ simulasi, hariIni, antrean: [], terkirim: 0 });
  if (simulasi) return NextResponse.json({ simulasi, hariIni, antrean, terkirim: 0 });

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

  // 1. Push notification (satu notifikasi gabungan per perangkat)
  if (subs && subs.length > 0) {
    const tampil = antrean.slice(0, 3).map((a) => `${a.nama} (${keterangan(a.hari)})`);
    const sisa = antrean.length - tampil.length;
    try {
      push = await kirimPush(subs, {
        title: 'Pengingat KGB',
        body: tampil.join(', ') + (sisa > 0 ? `, dan ${sisa} lainnya` : ''),
        url: '/dashboard/pegawai',
        tag: 'kgb-harian',
      });
    } catch (e) {
      catatan.push(`Push gagal: ${e instanceof Error ? e.message : 'kesalahan tidak dikenal'}`);
    }
  } else {
    catatan.push('Belum ada perangkat yang mengaktifkan notifikasi');
  }

  // 2. Email (lewat Gmail), hanya jika sudah disetel
  if (emailSiap() && emailAktif.length > 0) {
    const appUrl = process.env.APP_URL?.replace(/\/$/, '');
    const baris = antrean.map((a) => `${a.nama}: KGB ${formatBulan(a.kgb)} (${keterangan(a.hari)})`);

    const teks =
      `Pengingat KGB SiTepat\n\n${baris.map((b) => `- ${b}`).join('\n')}\n\n` +
      `Setelah KGB diproses, tekan "Tandai selesai" di aplikasi agar pengingat berhenti.` +
      (appUrl ? `\n${appUrl}/dashboard/pegawai` : '');

    const html =
      `<p><b>Pengingat KGB SiTepat</b></p><ul>${baris.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` +
      `<p>Setelah KGB diproses, tekan <b>Tandai selesai</b> di aplikasi agar pengingat berhenti.</p>` +
      (appUrl ? `<p><a href="${esc(appUrl)}/dashboard/pegawai">Buka SiTepat</a></p>` : '');

    try {
      await kirimEmail(emailAktif, `Pengingat KGB: ${antrean.length} pegawai`, teks, html);
      emailTerkirim = emailAktif.length;
    } catch (e) {
      catatan.push(`Email gagal: ${e instanceof Error ? e.message : 'kesalahan tidak dikenal'}`);
    }
  } else if (!emailSiap()) {
    catatan.push('Email belum disetel');
  }

  // Catat ke log hanya kalau ada yang berhasil terkirim. Kalau tidak, besok dicoba lagi.
  if (push.berhasil + emailTerkirim > 0) {
    await supabaseAdmin.from('pengingat_log').upsert(
      antrean.map((a) => ({ pegawai_id: a.pegawai_id, tanggal_kgb: a.kgb, tahap: a.hari })),
      { onConflict: 'pegawai_id,tanggal_kgb,tahap', ignoreDuplicates: true }
    );
  }

  return NextResponse.json({ simulasi, hariIni, antrean, terkirim: push.berhasil, email: emailTerkirim, catatan });
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminFromRequest } from '@/lib/server-auth';
import { kirimPush } from '@/lib/push';

export const runtime = 'nodejs';

// Kirim notifikasi percobaan ke semua perangkat milik admin yang sedang login
export async function POST(req: Request) {
  const user = await getAdminFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('user_id', user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: 'Belum ada perangkat yang mengaktifkan notifikasi.' }, { status: 400 });
  }

  try {
    const hasil = await kirimPush(subs, {
      title: 'Tes notifikasi SiTepat',
      body: 'Contoh isi pengingat:\n• Budi Santoso: Oktober 2026 (sisa 12 hari)\nSiapkan SK KGB, lalu tekan "Tandai selesai" agar pengingat berhenti.',
      url: '/dashboard/pegawai',
      tag: 'tes',
    });
    return NextResponse.json(hasil);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal mengirim' }, { status: 500 });
  }
}

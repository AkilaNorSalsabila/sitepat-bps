import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/server-auth';
import { emailSiap, kirimEmail } from '@/lib/mailer';

export const runtime = 'nodejs';

// Kirim email percobaan ke alamat admin yang sedang login
export async function POST(req: Request) {
  const user = await getAdminFromRequest(req);
  if (!user || !user.email) return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });

  if (!emailSiap()) {
    return NextResponse.json(
      { error: 'Email belum disetel. Isi GMAIL_USER dan GMAIL_APP_PASSWORD di environment variables.' },
      { status: 400 }
    );
  }

  try {
    await kirimEmail(
      [user.email],
      'Tes email SiTepat',
      'Email berfungsi. Pengingat KGB akan dikirim seperti ini.',
      '<p><b>Tes email SiTepat</b></p><p>Email berfungsi. Pengingat KGB akan dikirim seperti ini.</p>'
    );
    return NextResponse.json({ ke: user.email });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal mengirim email' }, { status: 500 });
  }
}

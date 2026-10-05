import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminFromRequest } from '@/lib/server-auth';

export const runtime = 'nodejs';

type SubBody = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function POST(req: Request) {
  const user = await getAdminFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });

  const sub = (await req.json()) as SubBody;
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'Data langganan tidak lengkap' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth_key: sub.keys.auth,
      user_agent: req.headers.get('user-agent'),
    },
    { onConflict: 'endpoint' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getAdminFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });

  const { endpoint } = (await req.json()) as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: 'Endpoint kosong' }, { status: 400 });

  await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}

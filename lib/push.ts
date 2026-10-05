import webpush from 'web-push';
import { supabaseAdmin } from './supabase-admin';

export type SubRow = { id: number; endpoint: string; p256dh: string; auth_key: string };
export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let siap = false;

function siapkan() {
  if (siap) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) {
    throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, dan VAPID_SUBJECT belum lengkap.');
  }
  webpush.setVapidDetails(subject, pub, priv);
  siap = true;
}

export async function kirimPush(subs: SubRow[], payload: PushPayload) {
  siapkan();
  let berhasil = 0;
  const kadaluarsa: number[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
          JSON.stringify(payload)
        );
        berhasil++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) kadaluarsa.push(s.id); // langganan sudah tidak berlaku
      }
    })
  );

  if (kadaluarsa.length) {
    await supabaseAdmin.from('push_subscriptions').delete().in('id', kadaluarsa);
  }

  return { berhasil, gagal: subs.length - berhasil };
}

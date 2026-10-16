// Bagian push notification yang berjalan di browser: pendaftaran perangkat dan pemulihan otomatis.
// Dipakai oleh layout dashboard (berjalan senyap setiap dashboard dibuka) dan halaman Notifikasi.
import { supabase } from '@/lib/supabase';

export const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

// Penanda "sengaja dimatikan di perangkat ini", supaya pemulihan otomatis tidak menyalakannya lagi
const KUNCI_MATI = 'sitepat-push-mati';

export const tandaiMati = (mati: boolean) => {
  try {
    if (mati) localStorage.setItem(KUNCI_MATI, '1');
    else localStorage.removeItem(KUNCI_MATI);
  } catch {
    /* penyimpanan browser diblokir: abaikan */
  }
};

const sengajaMati = () => {
  try {
    return localStorage.getItem(KUNCI_MATI) === '1';
  } catch {
    return false;
  }
};

export function keBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function panggilApi(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token}`,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Gagal (${res.status})`);
  return json;
}

export type StatusPush = 'aktif' | 'belum' | 'ditolak' | 'tidak-didukung';

export const pushDidukung = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// Status menurut browser saja (tanpa menghubungi server)
export async function statusLokal(): Promise<StatusPush> {
  if (!pushDidukung()) return 'tidak-didukung';
  if (Notification.permission === 'denied') return 'ditolak';
  if (Notification.permission !== 'granted') return 'belum';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'aktif' : 'belum';
}

function samaKunci(sub: PushSubscription, kunci: Uint8Array) {
  const k = sub.options?.applicationServerKey;
  if (!k) return true; // tidak bisa dibandingkan, anggap sama
  const a = new Uint8Array(k);
  return a.length === kunci.length && a.every((v, i) => v === kunci[i]);
}

// Memastikan perangkat ini terdaftar, baik di browser maupun di server.
// - Izin masih diberikan tapi langganan hilang: daftar ulang otomatis.
// - Langganan ada tapi barisnya hilang dari server: simpan lagi.
// - Kunci VAPID berubah: ganti langganan lama.
// Tidak pernah memunculkan dialog izin, dan tidak menyalakan kembali yang sengaja dimatikan.
export async function sinkronPush(): Promise<StatusPush> {
  if (!pushDidukung()) return 'tidak-didukung';
  if (Notification.permission === 'denied') return 'ditolak';
  if (Notification.permission !== 'granted' || !VAPID_PUBLIC || sengajaMati()) return 'belum';

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const kunci = keBytes(VAPID_PUBLIC);

  let sub = await reg.pushManager.getSubscription();
  if (sub && !samaKunci(sub, kunci)) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: kunci as BufferSource });
  }

  await panggilApi('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
  return 'aktif';
}
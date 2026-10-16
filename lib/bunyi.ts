// Suara pengingat KGB yang diputar di dalam aplikasi (saat SiTepat masih terbuka di tab mana pun).
// Catatan: setelah browser/tab ditutup, browser tidak mengizinkan suara kustom, jadi yang terdengar nada bawaan perangkat.

const FILE_SUARA = '/notifikasi-kgb.mp3';
const KUNCI_MATI = 'sitepat-bunyi-mati';

export const bunyiAktif = () => {
  try {
    return localStorage.getItem(KUNCI_MATI) !== '1';
  } catch {
    return true;
  }
};

export const aturBunyi = (aktif: boolean) => {
  try {
    if (aktif) localStorage.removeItem(KUNCI_MATI);
    else localStorage.setItem(KUNCI_MATI, '1');
  } catch {
    /* penyimpanan browser diblokir: abaikan */
  }
};

let audio: HTMLAudioElement | null = null;

// Mengembalikan true kalau suara berhasil diputar. Browser menolak (false) kalau halaman belum pernah diklik sama sekali.
export async function putarBunyi(paksa = false): Promise<boolean> {
  if (!paksa && !bunyiAktif()) return false;
  try {
    if (!audio) {
      audio = new Audio(FILE_SUARA);
      audio.preload = 'auto';
    }
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

// Service worker mengirim pesan { type: 'bunyi' } ke halaman yang terbuka setiap ada push masuk
export function pasangPendengarBunyi() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};
  const tangani = (e: MessageEvent) => {
    if (e.data && e.data.type === 'bunyi') void putarBunyi();
  };
  navigator.serviceWorker.addEventListener('message', tangani);
  return () => navigator.serviceWorker.removeEventListener('message', tangani);
}
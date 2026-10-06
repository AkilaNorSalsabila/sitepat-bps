'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { btnGhost, btnPrimary } from '@/components/ui';
import { AuthAlert } from '@/components/AuthShell';
import { formatTanggal } from '@/lib/kgb';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function keBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function panggilApi(path: string, init: RequestInit = {}) {
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

type Antrean = { nama: string; nip: string; kgb: string; hari: number };

export default function NotifikasiPage() {
  const [dukung, setDukung] = useState(true);
  const [aktif, setAktif] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');
  const [galat, setGalat] = useState('');
  const [simulasi, setSimulasi] = useState<Antrean[] | null>(null);
  const [berikutnya, setBerikutnya] = useState('');

  useEffect(() => {
    const periksa = async () => {
      const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setDukung(ok);
      if (!ok) return;
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setAktif(!!sub && Notification.permission === 'granted');
    };
    periksa();
  }, []);

  const jalankan = async (fn: () => Promise<void>) => {
    setSibuk(true);
    setPesan('');
    setGalat('');
    try {
      await fn();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Terjadi kesalahan');
    } finally {
      setSibuk(false);
    }
  };

  const aktifkan = () =>
    jalankan(async () => {
      if (!VAPID_PUBLIC) throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY belum diisi di .env.local');
      const izin = await Notification.requestPermission();
      if (izin !== 'granted') throw new Error('Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser.');

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keBytes(VAPID_PUBLIC) as BufferSource,
        }));

      await panggilApi('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
      setAktif(true);
      setPesan('Notifikasi aktif di perangkat ini.');
    });

  const matikan = () =>
    jalankan(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await panggilApi('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setAktif(false);
      setPesan('Notifikasi dimatikan di perangkat ini.');
    });

  const tesPush = () =>
    jalankan(async () => {
      const r = await panggilApi('/api/push/test', { method: 'POST' });
      setPesan(`Notifikasi tes dikirim ke ${r.berhasil} perangkat.`);
    });

  const tesEmail = () =>
    jalankan(async () => {
      const r = await panggilApi('/api/email/test', { method: 'POST' });
      setPesan(`Email tes dikirim ke ${r.ke}. Cek kotak masuk atau folder spam.`);
    });

  const cekSimulasi = () =>
    jalankan(async () => {
      const r = await panggilApi('/api/cron/kgb?dry=1');
      setSimulasi(r.daftar as Antrean[]);
      setBerikutnya(r.berikutnya as string);
    });

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-900">Notifikasi</h1>

      {!dukung && (
        <AuthAlert type="error">
          Browser ini belum mendukung notifikasi push. Di iPhone, buka lewat Safari lalu pilih Bagikan, Tambah ke Layar Utama, dan buka dari ikon itu.
        </AuthAlert>
      )}
      {galat && <AuthAlert type="error">{galat}</AuthAlert>}
      {pesan && <AuthAlert type="success">{pesan}</AuthAlert>}

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="font-bold text-slate-900">Notifikasi di perangkat ini</h2>
        <p className="text-sm text-slate-600">
          Status: <b>{aktif ? 'Aktif' : 'Belum aktif'}</b>. Setiap admin perlu mengaktifkannya sendiri di laptop dan HP yang dipakai.
          Notifikasi muncul dengan teks dan bunyi bawaan perangkat, walau aplikasi sedang ditutup.
        </p>
        <div className="flex flex-wrap gap-2">
          {!aktif ? (
            <button className={btnPrimary} onClick={aktifkan} disabled={sibuk || !dukung}>Aktifkan notifikasi</button>
          ) : (
            <>
              <button className={btnPrimary} onClick={tesPush} disabled={sibuk}>Kirim notifikasi tes</button>
              <button className={btnGhost} onClick={matikan} disabled={sibuk}>Matikan di perangkat ini</button>
            </>
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="font-bold text-slate-900">Email</h2>
        <p className="text-sm text-slate-600">
          Pengingat juga dikirim ke email semua admin yang aktif (gratis lewat Gmail). Cek dulu dengan email tes ke alamatmu sendiri.
        </p>
        <button className={btnGhost} onClick={tesEmail} disabled={sibuk}>Kirim email tes</button>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        <h2 className="font-bold text-slate-900">Kapan pengingat dikirim</h2>
        <p className="text-sm text-slate-600">
          Mulai 1 bulan sebelum tanggal KGB (KGB 5 November, mulai 5 Oktober), pengingat dikirim <b>tiga kali sehari</b>: jam 08.00, 09.00, dan 11.00 WIB.
          Emailnya cukup sekali sehari. Pengingat terus berulang setiap hari, termasuk setelah lewat jatuh tempo,
          sampai admin menekan <b>Tandai selesai</b> di menu Data pegawai. Setelah itu pengingatnya berhenti dan
          jadwal pindah 2 tahun ke depan.
        </p>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="font-bold text-slate-900">Simulasi pengecekan</h2>
        <p className="text-sm text-slate-600">
          Melihat siapa saja yang sedang dalam masa pengingat. Tidak mengirim apa pun.
        </p>
        <button className={btnGhost} onClick={cekSimulasi} disabled={sibuk}>Jalankan simulasi</button>
        {simulasi && (
          <>
            <p className="text-xs text-slate-500">Pengecekan berikutnya: {berikutnya}. {simulasi.length} pegawai akan diingatkan.</p>
            {simulasi.length > 0 && (
              <ul className="text-sm divide-y divide-slate-100">
                {simulasi.map((a) => (
                  <li key={a.nip} className="py-1.5 flex justify-between gap-3">
                    <span>
                      {a.nama}
                      <span className="block text-xs text-slate-400 font-mono">{a.nip}</span>
                    </span>
                    <span className="text-slate-500 text-right whitespace-nowrap">
                      KGB {formatTanggal(a.kgb)}
                      <span className="block text-xs">{a.hari < 0 ? `terlambat ${-a.hari} hari` : `sisa ${a.hari} hari`}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

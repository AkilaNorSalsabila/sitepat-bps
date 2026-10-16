'use client';

import React, { useEffect, useState } from 'react';
import { btnGhost, btnPrimary } from '@/components/ui';
import { AuthAlert } from '@/components/AuthShell';
import { formatTanggal } from '@/lib/kgb';
import { aturBunyi, bunyiAktif, putarBunyi } from '@/lib/bunyi';
import {
  StatusPush,
  VAPID_PUBLIC,
  keBytes,
  panggilApi,
  sinkronPush,
  statusLokal,
  tandaiMati,
} from '@/lib/push-client';

type Antrean = { nama: string; nip: string; kgb: string; hari: number };

export default function NotifikasiPage() {
  const [status, setStatus] = useState<StatusPush | 'memeriksa'>('memeriksa');
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');
  const [galat, setGalat] = useState('');
  const [simulasi, setSimulasi] = useState<Antrean[] | null>(null);
  const [berikutnya, setBerikutnya] = useState('');
  // Aman dibaca langsung: halaman ini baru dirender di browser setelah layout memastikan login
  const [bunyi, setBunyi] = useState(() => bunyiAktif());

  const dukung = status !== 'tidak-didukung';
  const aktif = status === 'aktif';

  // Saat halaman dibuka: periksa, dan pulihkan otomatis kalau pendaftaran perangkat ini hilang
  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const st = await sinkronPush();
        if (!batal) setStatus(st);
      } catch (e) {
        if (batal) return;
        setStatus(await statusLokal());
        setGalat(`Pendaftaran ke server belum berhasil: ${e instanceof Error ? e.message : 'terjadi kesalahan'}`);
      }
    })();
    return () => {
      batal = true;
    };
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
      if (izin !== 'granted') {
        setStatus(izin === 'denied' ? 'ditolak' : 'belum');
        throw new Error('Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser.');
      }
      tandaiMati(false);

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keBytes(VAPID_PUBLIC) as BufferSource,
        }));

      await panggilApi('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
      setStatus('aktif');
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
      tandaiMati(true);
      setStatus('belum');
      setPesan('Notifikasi dimatikan di perangkat ini.');
    });

  const tesPush = () =>
    jalankan(async () => {
      const r = await panggilApi('/api/push/test', { method: 'POST' });
      setPesan(`Notifikasi tes dikirim ke ${r.berhasil} perangkat.`);
    });

  const ubahBunyi = (v: boolean) => {
    setBunyi(v);
    aturBunyi(v);
  };

  const contohSuara = async () => {
    setGalat('');
    const ok = await putarBunyi(true);
    if (!ok) setGalat('Suara tidak bisa diputar. Periksa volume perangkat atau izin suara untuk situs ini di browser.');
  };

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
          Status: <b>{status === 'memeriksa' ? 'Memeriksa...' : aktif ? 'Aktif' : status === 'ditolak' ? 'Diblokir di browser' : 'Belum aktif'}</b>. Setiap admin perlu mengaktifkannya sendiri di laptop dan HP yang dipakai.
          Notifikasi muncul dengan teks dan bunyi bawaan perangkat, walau aplikasi sedang ditutup.
        </p>
        {status === 'ditolak' && (
          <p className="text-sm text-red-700">
            Izin notifikasi diblokir di browser ini. Klik ikon gembok di samping alamat situs, ubah Notifikasi menjadi Izinkan, lalu muat ulang halaman ini.
          </p>
        )}
        <p className="text-xs text-slate-500">
          Selama izinnya masih ada, SiTepat memeriksa dan memperbarui pendaftaran perangkat ini otomatis setiap kali dibuka. Kalau data situs dihapus
          (pembersih browser, &quot;hapus cookie dan data situs&quot;), izin ikut hilang dan perlu diaktifkan lagi di sini.
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
        <h2 className="font-bold text-slate-900">Suara pengingat</h2>
        <p className="text-sm text-slate-600">
          Selama SiTepat masih terbuka di tab mana pun (walau sedang di tab lain atau diminimalkan), pengingat KGB memutar suara khusus ini.
          Setelah browser atau tab ditutup, browser tidak mengizinkan suara kustom, jadi yang terdengar nada bawaan perangkat.
          Supaya suara bisa diputar otomatis, klik halaman SiTepat sekali setelah membukanya.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button className={btnGhost} onClick={contohSuara}>Putar contoh suara</button>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={bunyi} onChange={(e) => ubahBunyi(e.target.checked)} />
            Bunyikan suara di perangkat ini
          </label>
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
          Mulai 1 bulan sebelum tanggal KGB (KGB 5 November, mulai 5 Oktober), pengingat dikirim <b>empat kali sehari</b>: jam 08.00, 09.00, 11.00, dan 15.00 WIB.
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
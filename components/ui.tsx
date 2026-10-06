import React from 'react';
import type { NadaStatus } from '@/lib/kgb';

/* ---------- Ikon (garis, gaya Heroicons) ---------- */
export const IKON = {
  cari: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  tambah: 'M12 4.5v15m7.5-7.5h-15',
  impor: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
  ubah: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  hapus: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  selesai: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  tutup: 'M6 18L18 6M6 6l12 12',
  peringatan: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  kosong: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
  beranda: 'M2.25 12l8.955-8.955a1.125 1.125 0 011.59 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  pegawai: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  kalender: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  notifikasi: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  akun: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  menu: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  keluar: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
  jam: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  tanda: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
} as const;

export function Icon({ d, className = 'w-4 h-4' }: { d: string; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className={`${className} shrink-0`} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

/* ---------- Tombol ---------- */
const fokus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--st-sky)]';

export const btnPrimary =
  `inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--st-accent)] text-white shadow-sm shadow-blue-900/10 hover:bg-[var(--st-accent-hover)] active:bg-[var(--st-accent-active)] transition disabled:opacity-60 disabled:cursor-not-allowed ${fokus}`;

export const btnGhost =
  `inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed ${fokus}`;

export const btnDanger =
  `inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 transition disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-red-400`;

const nadaIkon = {
  biru: 'text-[var(--st-accent)] hover:bg-sky-50',
  merah: 'text-red-500 hover:bg-red-50',
  hijau: 'text-emerald-600 hover:bg-emerald-50',
  abu: 'text-slate-500 hover:bg-slate-100',
};

// Tombol ikon bulat dengan tooltip (title) dan label aksesibilitas
export function IconButton({
  d,
  label,
  onClick,
  tone = 'abu',
  disabled,
}: {
  d: string;
  label: string;
  onClick: () => void;
  tone?: keyof typeof nadaIkon;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${nadaIkon[tone]} ${fokus}`}
    >
      <Icon d={d} className="w-[18px] h-[18px]" />
    </button>
  );
}

/* ---------- Badge ---------- */
const nada: Record<NadaStatus | 'biru', { box: string; dot: string }> = {
  merah: { box: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  kuning: { box: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  hijau: { box: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  abu: { box: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  biru: { box: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
};

export function Badge({
  tone = 'abu',
  title,
  titik = true,
  children,
}: {
  tone?: NadaStatus | 'biru';
  title?: string;
  titik?: boolean;
  children: React.ReactNode;
}) {
  const n = nada[tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset whitespace-nowrap ${n.box}`}
    >
      {titik && <span className={`w-1.5 h-1.5 rounded-full ${n.dot}`} />}
      {children}
    </span>
  );
}

/* ---------- Avatar inisial ---------- */
const WARNA_AVATAR = ['bg-sky-100 text-sky-800', 'bg-indigo-100 text-indigo-800', 'bg-teal-100 text-teal-800', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-800', 'bg-violet-100 text-violet-800'];

export function Avatar({ nama }: { nama: string }) {
  const kata = nama.replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean);
  const inisial = ((kata[0]?.[0] ?? '') + (kata[1]?.[0] ?? '')).toUpperCase() || '?';
  let h = 0;
  for (const c of nama) h = (h * 31 + c.charCodeAt(0)) % WARNA_AVATAR.length;
  return (
    <span className={`w-10 h-10 rounded-full grid place-items-center text-sm font-bold shrink-0 ${WARNA_AVATAR[h]}`} aria-hidden="true">
      {inisial}
    </span>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  title,
  onClose,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className={`w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition ${fokus}`}>
            <Icon d={IKON.tutup} className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Dialog konfirmasi (pengganti window.confirm) ---------- */
export function ConfirmDialog({
  judul,
  pesan,
  labelYa,
  bahaya,
  sedang,
  galat,
  onYa,
  onBatal,
}: {
  judul: string;
  pesan: React.ReactNode;
  labelYa: string;
  bahaya?: boolean;
  sedang?: boolean;
  galat?: string;
  onYa: () => void;
  onBatal: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      onMouseDown={(e) => e.target === e.currentTarget && !sedang && onBatal()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className={`w-11 h-11 rounded-full grid place-items-center mb-4 ${bahaya ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-[var(--st-accent)]'}`}>
          <Icon d={bahaya ? IKON.peringatan : IKON.selesai} className="w-6 h-6" />
        </div>
        <h2 className="font-bold text-slate-900 text-lg">{judul}</h2>
        <div className="mt-1.5 text-sm text-slate-600 leading-relaxed">{pesan}</div>
        {galat && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{galat}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button className={btnGhost} onClick={onBatal} disabled={sedang}>Batal</button>
          <button className={bahaya ? btnDanger : btnPrimary} onClick={onYa} disabled={sedang}>
            {sedang ? 'Memproses...' : labelYa}
          </button>
        </div>
      </div>
    </div>
  );
}

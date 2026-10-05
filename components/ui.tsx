import React from 'react';
import type { NadaStatus } from '@/lib/kgb';

export const btnPrimary =
  'px-3.5 py-2 text-sm font-semibold rounded-lg bg-[var(--st-accent)] text-white hover:bg-[var(--st-accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--st-sky)]';

export const btnGhost =
  'px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed';

const nada: Record<NadaStatus | 'biru', string> = {
  merah: 'bg-red-50 text-red-700 border-red-200',
  kuning: 'bg-amber-50 text-amber-700 border-amber-200',
  hijau: 'bg-green-50 text-green-700 border-green-200',
  abu: 'bg-slate-100 text-slate-600 border-slate-200',
  biru: 'bg-sky-50 text-sky-800 border-sky-200',
};

export function Badge({
  tone = 'abu',
  title,
  children,
}: {
  tone?: NadaStatus | 'biru';
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${nada[tone]}`}
    >
      {children}
    </span>
  );
}

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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className={`bg-white rounded-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-auto`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

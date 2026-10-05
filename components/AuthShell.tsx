import React from 'react';
import './auth-theme.css';

// Logo ada di folder public/
// - LOGO_SRC       : versi asli (tulisan biru tua), untuk latar terang
// - LOGO_LIGHT_SRC : versi terang (tulisan putih), untuk panel biru tua
const LOGO_SRC = '/logo-sitepat.png';
const LOGO_LIGHT_SRC = '/logo-sitepat-light.png';

export const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--st-sky)] focus:border-transparent text-sm text-slate-800 placeholder-slate-400 transition disabled:bg-slate-100 disabled:cursor-not-allowed';

export const labelClass = 'block text-xs font-semibold text-slate-700';

export const linkClass = 'font-semibold text-[var(--st-link)] hover:underline focus:outline-none';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen w-full bg-[var(--st-page)] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-5 min-h-[560px]">
        {/* Panel kiri (layar medium ke atas) */}
        <aside className="hidden md:flex md:col-span-2 flex-col items-center justify-center gap-8 bg-[var(--st-navy)] p-8">
          <img src={LOGO_LIGHT_SRC} alt="SiTepat" className="w-full max-w-[280px] h-auto object-contain" />
          <p className="text-sm leading-relaxed text-sky-100 text-center max-w-[260px]">
            Pantau jadwal kenaikan gaji berkala (KGB) dan ingatkan agar selesai tepat waktu.
          </p>
        </aside>

        {/* Panel kanan: form */}
        <section className="md:col-span-3 p-6 sm:p-10 md:p-12 flex flex-col justify-center">
          <img
            src={LOGO_SRC}
            alt="SiTepat"
            className="md:hidden h-16 w-auto object-contain self-center mb-6"
          />
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <div className="w-10 h-1 rounded bg-[var(--st-gold)] mt-2 mb-3" />
            <p className="text-sm text-slate-500 leading-relaxed">{subtitle}</p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

const alertStyles = {
  error: 'bg-red-50 border-red-200 text-red-600',
  success: 'bg-green-50 border-green-200 text-green-700',
  info: 'bg-sky-50 border-sky-200 text-sky-800',
};

export function AuthAlert({
  type,
  children,
}: {
  type: keyof typeof alertStyles;
  children: React.ReactNode;
}) {
  const icon = type === 'error' ? '⚠️ ' : type === 'success' ? '✅ ' : '';
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`p-2.5 border text-xs rounded-lg text-center font-medium leading-relaxed ${alertStyles[type]}`}
    >
      {icon}
      {children}
    </div>
  );
}

export function SubmitButton({
  loading,
  loadingText,
  children,
}: {
  loading: boolean;
  loadingText: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full mt-2 py-2.5 px-4 bg-[var(--st-accent)] hover:bg-[var(--st-accent-hover)] active:bg-[var(--st-accent-active)] text-white font-semibold rounded-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--st-sky)]"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

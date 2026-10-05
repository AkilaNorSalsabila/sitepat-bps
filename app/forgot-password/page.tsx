'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AuthShell, AuthAlert, SubmitButton, inputClass, labelClass, linkClass } from '@/components/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Masukkan email yang valid.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // Pesan sama baik email terdaftar maupun tidak, supaya email orang lain tidak bisa ditebak
      setSuccessMsg(
        'Jika email terdaftar, tautan pemulihan password sudah dikirim. Cek kotak masuk atau folder spam.'
      );
    } catch (error) {
      console.error('Forgot Password Error:', error);
      setErrorMsg('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Lupa password"
      subtitle="Masukkan email akun Anda, kami kirim tautan untuk membuat password baru."
    >
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        {errorMsg && <AuthAlert type="error">{errorMsg}</AuthAlert>}
        {successMsg && <AuthAlert type="success">{successMsg}</AuthAlert>}

        <div className="space-y-1">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
            className={inputClass}
            required
          />
        </div>

        <SubmitButton loading={loading} loadingText="Mengirim...">
          Kirim tautan pemulihan
        </SubmitButton>

        <p className="text-center text-xs text-slate-600 pt-1">
          <Link href="/login" className={linkClass}>
            Kembali ke login
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

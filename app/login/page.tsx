'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AuthShell, AuthAlert, SubmitButton, inputClass, labelClass, linkClass } from '@/components/AuthShell';
import PasswordInput from '@/components/PasswordInput';

// Semua pengguna adalah admin, jadi tujuannya satu
const AFTER_LOGIN_PATH = '/dashboard';

// Pesan untuk akun yang belum boleh masuk
const STATUS_MESSAGE: Record<string, string> = {
  pending: 'Akun Anda masih menunggu persetujuan admin.',
  rejected: 'Pendaftaran akun Anda ditolak oleh admin.',
  nonaktif: 'Akun Anda saat ini tidak aktif. Hubungi admin lain untuk mengaktifkannya.',
};

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanInput = identifier.trim().toLowerCase();

    if (!cleanInput || !password) {
      setErrorMsg('Username/email dan password wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      // 1. Kalau yang diketik username, cari email-nya lewat fungsi database
      let loginEmail = cleanInput;

      if (!cleanInput.includes('@')) {
        const { data: foundEmail } = await supabase.rpc('email_from_username', {
          p_username: cleanInput,
        });

        if (!foundEmail) {
          setErrorMsg('Username atau password salah. Silakan periksa kembali.');
          return;
        }

        loginEmail = foundEmail as string;
      }

      // 2. Login Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError) {
        const msg = authError.message.toLowerCase();

        if (msg.includes('invalid login credentials')) {
          setErrorMsg('Username atau password salah. Silakan periksa kembali.');
        } else if (msg.includes('email not confirmed')) {
          setErrorMsg('Email belum dikonfirmasi. Cek kotak masuk email Anda.');
        } else {
          setErrorMsg(authError.message);
        }
        return;
      }

      // 3. Cek status akun, hanya "approved" yang boleh masuk
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setErrorMsg('Profil akun tidak ditemukan. Silakan hubungi admin.');
        return;
      }

      const status = String(profile.status ?? '').trim().toLowerCase();

      if (status !== 'approved') {
        await supabase.auth.signOut();
        setErrorMsg(STATUS_MESSAGE[status] ?? 'Status akun tidak valid. Hubungi admin.');
        return;
      }

      setSuccessMsg('Berhasil masuk! Mengalihkan...');

      setTimeout(() => {
        router.push(AFTER_LOGIN_PATH);
        router.refresh();
      }, 600);
    } catch (error) {
      console.error('Login Error:', error);
      setErrorMsg('Terjadi kesalahan saat menghubungkan ke server. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Selamat datang" subtitle="Masuk untuk mengelola pengingat KGB.">
      <form onSubmit={handleLogin} className="space-y-4 w-full">
        {errorMsg && <AuthAlert type="error">{errorMsg}</AuthAlert>}
        {successMsg && <AuthAlert type="success">{successMsg}</AuthAlert>}

        <div className="space-y-1">
          <label htmlFor="identifier" className={labelClass}>
            Username / Email
          </label>
          <input
            id="identifier"
            type="text"
            placeholder="Masukkan username atau email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            disabled={loading}
            className={inputClass}
            required
          />
        </div>

        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          disabled={loading}
        />

        <div className="flex justify-end">
          <Link href="/forgot-password" className={`text-xs ${linkClass}`}>
            Lupa password?
          </Link>
        </div>

        <SubmitButton loading={loading} loadingText="Memproses...">
          Masuk
        </SubmitButton>

        <p className="text-center text-xs text-slate-600 pt-1">
          Belum punya akun?{' '}
          <Link href="/register" className={linkClass}>
            Daftar sekarang
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

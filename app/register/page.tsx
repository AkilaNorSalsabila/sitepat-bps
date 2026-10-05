'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AuthShell, AuthAlert, SubmitButton, inputClass, labelClass, linkClass } from '@/components/AuthShell';
import PasswordInput from '@/components/PasswordInput';

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanFullName || !cleanEmail || !cleanUsername || !password || !confirmPassword) {
      setErrorMsg('Harap isi semua kolom yang wajib.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Format email tidak valid.');
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
      setErrorMsg('Username hanya boleh huruf kecil, angka, titik, underscore, dan strip.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password minimal terdiri dari 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok dengan password Anda.');
      return;
    }

    setLoading(true);

    try {
      // Status TIDAK dikirim dari sini. Trigger database selalu membuat
      // akun baru dengan status "pending" sampai disetujui admin.
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanFullName,
            username: cleanUsername,
            phone: cleanPhone,
          },
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();

        if (msg.includes('already registered') || msg.includes('already exists')) {
          setErrorMsg('Email tersebut sudah terdaftar. Silakan masuk atau gunakan email lain.');
        } else if (msg.includes('database error')) {
          setErrorMsg('Username sudah digunakan. Coba username lain.');
        } else if (msg.includes('password')) {
          setErrorMsg('Password tidak memenuhi persyaratan.');
        } else {
          setErrorMsg(error.message);
        }
        return;
      }

      // Supabase mengembalikan user tanpa identities kalau email sudah terdaftar
      if (!data.user || data.user.identities?.length === 0) {
        setErrorMsg('Email tersebut sudah terdaftar. Silakan masuk atau gunakan email lain.');
        return;
      }

      // Pastikan tidak ada sesi aktif sebelum akun disetujui
      await supabase.auth.signOut();

      setSuccessMsg('Pendaftaran berhasil! Akun Anda menunggu persetujuan admin.');
      setTimeout(() => router.push('/login'), 2500);
    } catch (error) {
      console.error('Register Error:', error);
      setErrorMsg('Terjadi kesalahan saat registrasi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Daftar akun admin" subtitle="Lengkapi data diri untuk mengajukan akun.">
      <form onSubmit={handleRegister} className="space-y-3.5 w-full">
        {errorMsg && <AuthAlert type="error">{errorMsg}</AuthAlert>}
        {successMsg && <AuthAlert type="success">{successMsg}</AuthAlert>}

        <div className="space-y-1">
          <label htmlFor="fullName" className={labelClass}>
            Nama lengkap
          </label>
          <input
            id="fullName"
            type="text"
            placeholder="Masukkan nama lengkap Anda"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className={inputClass}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div className="space-y-1">
            <label htmlFor="username" className={labelClass}>
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Pilih username unik"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              autoComplete="username"
              disabled={loading}
              className={inputClass}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="phone" className={labelClass}>
            No. telepon / WA (opsional)
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PasswordInput
            id="password"
            label="Password (min. 6 karakter)"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            disabled={loading}
          />
          <PasswordInput
            id="confirmPassword"
            label="Konfirmasi password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        <AuthAlert type="info">
          Akun baru berstatus <b>menunggu persetujuan</b> dan baru bisa dipakai setelah disetujui admin.
        </AuthAlert>

        <SubmitButton loading={loading} loadingText="Memproses...">
          Daftar sekarang
        </SubmitButton>

        <p className="text-center text-xs text-slate-600 pt-1">
          Sudah punya akun?{' '}
          <Link href="/login" className={linkClass}>
            Masuk di sini
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

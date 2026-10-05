"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [siap, setSiap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState("");
  const [error, setError] = useState("");

  // Link dari email membawa token pemulihan; Supabase membuat sesi dari token itu
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSiap(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSiap(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPesan("");

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== konfirmasi) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setPesan("Password berhasil diubah. Mengalihkan ke halaman login...");
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold">Reset Password</h1>

        {!siap && (
          <p className="text-sm text-gray-500">
            Memeriksa tautan reset... Jika tidak berhasil, minta tautan baru
            lewat halaman Lupa Password.
          </p>
        )}

        <input
          type="password"
          placeholder="Password baru"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Konfirmasi password baru"
          value={konfirmasi}
          onChange={(e) => setKonfirmasi(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {pesan && <p className="text-sm text-green-600">{pesan}</p>}

        <button
          type="submit"
          disabled={loading || !siap}
          className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan Password Baru"}
        </button>
      </form>
    </main>
  );
}
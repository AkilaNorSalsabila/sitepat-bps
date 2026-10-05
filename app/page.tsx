import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-16 text-center">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
        <Image
          src="/logo-sitepat.png"
          alt="Logo SiTepat"
          width={96}
          height={96}
          priority
        />

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            SiTepat
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            Sistem informasi kepegawaian dengan pengingat Kenaikan Gaji Berkala
            (KGB) otomatis.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-blue-600 px-6 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-zinc-300 px-6 font-medium text-zinc-800 transition-colors hover:bg-zinc-100"
          >
            Daftar
          </Link>
        </div>
      </div>

      <p className="mt-8 text-sm text-zinc-500">
        &copy; {new Date().getFullYear()} SiTepat
      </p>
    </main>
  );
}
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge, btnGhost } from '@/components/ui';

type Akun = { id: string; full_name: string; username: string; email: string; status: string; created_at: string };

const nada = { pending: 'kuning', approved: 'hijau', rejected: 'merah', nonaktif: 'abu' } as const;

export default function AkunPage() {
  const [rows, setRows] = useState<Akun[]>([]);
  const [saya, setSaya] = useState('');
  const [galat, setGalat] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let batal = false;
    const muat = async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, status, created_at')
        .order('created_at', { ascending: false });
      if (batal) return;
      setSaya(u.user?.id ?? '');
      if (error) setGalat(error.message);
      else setRows(data as Akun[]);
    };
    muat();
    return () => {
      batal = true;
    };
  }, [tick]);

  const ubah = async (id: string, status: string) => {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    if (error) setGalat(error.message);
    else setTick((t) => t + 1);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Akun admin</h1>
      <p className="text-sm text-slate-500">Akun yang baru mendaftar berstatus pending sampai disetujui di sini.</p>
      {galat && <p className="text-sm text-red-600">⚠️ {galat}</p>}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="text-left p-3">Nama</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="p-3">
                  <p className="font-semibold text-slate-800">{a.full_name}</p>
                  <p className="text-xs text-slate-500">@{a.username}</p>
                </td>
                <td className="p-3 text-slate-600">{a.email}</td>
                <td className="p-3"><Badge tone={nada[a.status as keyof typeof nada] ?? 'abu'}>{a.status}</Badge></td>
                <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                  {a.status !== 'approved' && (
                    <button className={btnGhost} onClick={() => ubah(a.id, 'approved')}>
                      {a.status === 'pending' ? 'Setujui' : 'Aktifkan'}
                    </button>
                  )}
                  {a.status === 'pending' && (
                    <button className={btnGhost} onClick={() => ubah(a.id, 'rejected')}>Tolak</button>
                  )}
                  {a.status === 'approved' && a.id !== saya && (
                    <button className={btnGhost} onClick={() => ubah(a.id, 'nonaktif')}>Nonaktifkan</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SiTepat - Sistem Informasi Tepat Waktu',
    short_name: 'SiTepat',
    description: 'Pengingat jadwal kenaikan gaji berkala (KGB) pegawai',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#123a63',
    theme_color: '#123a63',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

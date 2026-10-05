import nodemailer from 'nodemailer';

// Email gratis lewat Gmail (App Password). Batas Gmail sekitar 500 email per hari, jauh di atas kebutuhan ini.
export const emailSiap = () => !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;

export async function kirimEmail(penerima: string[], subjek: string, teks: string, html: string) {
  if (!emailSiap()) throw new Error('GMAIL_USER dan GMAIL_APP_PASSWORD belum diisi.');

  const pengirim = process.env.GMAIL_USER as string;
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: pengirim, pass: process.env.GMAIL_APP_PASSWORD },
  });

  // Penerima disembunyikan (bcc) supaya alamat satu admin tidak terlihat admin lain
  await transport.sendMail({
    from: `SiTepat <${pengirim}>`,
    to: pengirim,
    bcc: penerima,
    subject: subjek,
    text: teks,
    html,
  });
}

export const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

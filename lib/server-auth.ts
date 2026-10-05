import { supabaseAdmin } from './supabase-admin';

// Mengembalikan user jika token valid DAN akunnya berstatus approved, selain itu null
export async function getAdminFromRequest(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('status')
    .eq('id', data.user.id)
    .single();

  return profile?.status === 'approved' ? data.user : null;
}

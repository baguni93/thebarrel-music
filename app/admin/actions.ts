'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { withDefaults, type SiteContent } from '@/lib/content';

export async function saveContent(content: SiteContent): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '로그인이 만료되었습니다. 다시 로그인해 주세요.' };

  const { error } = await supabase
    .from('site_content')
    .update({ content: withDefaults(content), updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) return { ok: false, message: `저장하지 못했습니다: ${error.message}` };

  revalidatePath('/');
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

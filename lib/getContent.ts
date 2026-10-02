import { createClient } from '@/lib/supabase/server';
import { defaultContent, withDefaults, type SiteContent } from '@/lib/content';

export async function getContent(): Promise<SiteContent> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return defaultContent;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('site_content').select('content').eq('id', 1).single();
    return withDefaults(data?.content);
  } catch {
    return defaultContent;
  }
}

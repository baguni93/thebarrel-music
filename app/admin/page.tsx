import { getContent } from '@/lib/getContent';
import Editor from './Editor';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const content = await getContent();
  return <Editor initial={content} />;
}

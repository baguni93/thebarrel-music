import { checkPassword, clearSessionCookie, isLoggedIn, makeSessionCookie } from './auth';
import { withDefaults, type SiteContent } from './content';
import { PAGES, renderPage, visiblePages, type PageKey } from './render';

export interface Env {
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  ADMIN_PASSWORD?: string;
  CF_VERSION_METADATA?: WorkerVersionMetadata; // 배포할 때마다 바뀌는 버전 id
}

/** 미리 만든 홈페이지가 어느 배포 버전으로 만들어졌는지 기록해 두고, 새로 배포되면 다시 만든다 */
const deployVersion = (env: Env) => env.CF_VERSION_METADATA?.id ?? 'dev';

async function putPage(env: Env, page: PageKey, html: string) {
  await env.BUCKET.put(pageKey(page), html, {
    httpMetadata: { contentType: 'text/html; charset=utf-8' },
    customMetadata: { v: deployVersion(env) },
  });
}

// R2 안의 파일 이름
const CONTENT_KEY = 'content.json'; // 관리자에서 저장한 홈페이지 내용
// 저장할 때 미리 만들어 둔 페이지 화면: site/home.html, site/about.html …
const pageKey = (page: PageKey) => `site/${page}.html`;
const MAX_UPLOAD = 50 * 1024 * 1024; // 50MB
const ALLOWED_UPLOAD = /^(image\/(jpeg|png|webp|gif|avif|svg\+xml)|video\/(mp4|webm))$/;
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/svg+xml': 'svg',
  'video/mp4': 'mp4', 'video/webm': 'webm',
};

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

async function readContent(env: Env): Promise<SiteContent> {
  const obj = await env.BUCKET.get(CONTENT_KEY);
  return withDefaults(obj ? await obj.json() : null);
}

/** 내용을 저장하면서 홈페이지 화면을 새로 만들어 둔다. 직전 내용은 history/ 에 백업 */
async function publish(env: Env, content: SiteContent, origin: string) {
  const prev = await env.BUCKET.get(CONTENT_KEY);
  if (prev) {
    await env.BUCKET.put(`history/${new Date().toISOString()}.json`, prev.body, {
      httpMetadata: { contentType: 'application/json' },
    });
  }
  await env.BUCKET.put(CONTENT_KEY, JSON.stringify(content), { httpMetadata: { contentType: 'application/json' } });
  const shown = visiblePages(content);
  await Promise.all(PAGES.map((p) =>
    shown.includes(p)
      ? putPage(env, p.key, renderPage(content, p.key, origin))
      : env.BUCKET.delete(pageKey(p.key)), // 영상을 모두 지우면 영상 페이지도 없앤다
  ));
}

/** 각 페이지: 미리 만들어 둔 HTML을 그대로 보낸다. 없거나 예전 배포 버전으로 만든 것이면 그때 한 번 다시 만든다 */
async function servePage(request: Request, env: Env, page: PageKey) {
  let obj = await env.BUCKET.get(pageKey(page), { onlyIf: request.headers });
  if (!obj || obj.customMetadata?.v !== deployVersion(env)) {
    const content = await readContent(env);
    // 영상이 없으면 영상 페이지는 메뉴에서 빠지므로 홈으로 보낸다
    if (!visiblePages(content).some((p) => p.key === page)) return Response.redirect(new URL('/', request.url).toString(), 302);
    const html = renderPage(content, page, new URL(request.url).origin);
    await putPage(env, page, html);
    obj = await env.BUCKET.get(pageKey(page));
    if (!obj) return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
    etag: obj.httpEtag,
  });
  if (!('body' in obj)) return new Response(null, { status: 304, headers });
  return new Response(request.method === 'HEAD' ? null : obj.body, { headers });
}

/** 업로드한 사진·영상. 영상 탐색(Range 요청)도 지원 */
async function serveMedia(request: Request, env: Env, key: string) {
  const obj = await env.BUCKET.get(key, { range: request.headers, onlyIf: request.headers });
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  // 올린 파일(특히 SVG)을 직접 열어도 안에 든 스크립트가 실행되지 않게
  headers.set('content-security-policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; media-src 'self'; sandbox");
  headers.set('x-content-type-options', 'nosniff');
  if (!('body' in obj)) return new Response(null, { status: 304, headers });

  const r = obj.range as { offset?: number; length?: number; suffix?: number } | undefined;
  if (request.headers.has('range') && r) {
    const offset = r.suffix !== undefined ? obj.size - r.suffix : r.offset ?? 0;
    const length = r.suffix !== undefined ? r.suffix : r.length ?? obj.size - offset;
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set('content-length', String(length));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set('content-length', String(obj.size));
  return new Response(request.method === 'HEAD' ? null : obj.body, { headers });
}

async function readBody(request: Request): Promise<SiteContent | Response> {
  const text = await request.text();
  if (text.length > 1_000_000) return json({ error: '내용이 너무 큽니다.' }, 413);
  try {
    return withDefaults(JSON.parse(text));
  } catch {
    return json({ error: '내용 형식이 올바르지 않습니다.' }, 400);
  }
}

async function handleApi(request: Request, env: Env, url: URL) {
  const secure = url.protocol === 'https:';
  const path = url.pathname;

  // 다른 사이트에서 관리자 기능을 호출하지 못하게 막기
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return json({ error: '허용되지 않은 요청입니다.' }, 403);
  }

  if (path === '/api/login' && request.method === 'POST') {
    if (!env.ADMIN_PASSWORD) return json({ error: '관리자 비밀번호(ADMIN_PASSWORD)가 아직 설정되지 않았습니다.' }, 500);
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    if (!(await checkPassword(env.ADMIN_PASSWORD, String(body.password ?? '')))) {
      await new Promise((r) => setTimeout(r, 800)); // 비밀번호 연속 대입을 늦춘다
      return json({ error: '비밀번호가 맞지 않습니다.' }, 401);
    }
    return json({ ok: true }, 200, { 'set-cookie': await makeSessionCookie(env.ADMIN_PASSWORD, secure) });
  }

  if (path === '/api/logout' && request.method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(secure) });
  }

  if (!(await isLoggedIn(request, env.ADMIN_PASSWORD))) return json({ error: '로그인이 필요합니다.' }, 401);

  if (path === '/api/me') return json({ ok: true });

  if (path === '/api/content' && request.method === 'GET') return json(await readContent(env));

  if (path === '/api/content' && request.method === 'PUT') {
    const content = await readBody(request);
    if (content instanceof Response) return content;
    await publish(env, content, url.origin);
    return json({ ok: true });
  }

  // 저장하지 않고 화면만 만들어 돌려준다 (관리자 미리보기)
  if (path === '/api/preview' && request.method === 'POST') {
    const content = await readBody(request);
    if (content instanceof Response) return content;
    const want = url.searchParams.get('page') as PageKey | null;
    const page = PAGES.some((p) => p.key === want) ? (want as PageKey) : 'home';
    return new Response(renderPage(content, page, url.origin, { preview: true }), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  if (path === '/api/upload' && request.method === 'POST') {
    const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const size = Number(request.headers.get('content-length') ?? 0);
    if (!ALLOWED_UPLOAD.test(type)) return json({ error: '사진(jpg, png, webp, gif, svg) 또는 mp4·webm 영상만 올릴 수 있습니다.' }, 415);
    if (!size || size > MAX_UPLOAD) return json({ error: '파일은 50MB 이하만 올릴 수 있습니다.' }, 413);
    const month = new Date().toISOString().slice(0, 7);
    const key = `media/${month}/${crypto.randomUUID()}.${EXT[type]}`;
    await env.BUCKET.put(key, request.body, { httpMetadata: { contentType: type } });
    return json({ url: `/${key}` });
  }

  return json({ error: '없는 주소입니다.' }, 404);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/api/')) return handleApi(request, env, url);

    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });

    const route = path.replace(/\/+$/, '') || '/';
    const page = PAGES.find((p) => p.path === route || (p.key === 'home' && route === '/index.html'));
    if (page) return servePage(request, env, page.key);
    if (path.startsWith('/media/')) return serveMedia(request, env, decodeURIComponent(path.slice(1)));

    return new Response('페이지를 찾을 수 없습니다.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
} satisfies ExportedHandler<Env>;

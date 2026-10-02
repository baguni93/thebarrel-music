// 관리자 로그인: 비밀번호 하나(ADMIN_PASSWORD)로 로그인하고, 서명된 쿠키로 세션을 유지한다.
// 비밀번호를 바꾸면 기존 로그인은 모두 풀린다.

const COOKIE = 'tb_admin';
const SESSION_DAYS = 14;
const enc = new TextEncoder();

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sign(secret: string, data: string) {
  return toHex(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data)));
}

/** 길이와 상관없이 일정한 시간으로 문자열 비교 */
async function safeEqual(a: string, b: string) {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

export async function checkPassword(secret: string | undefined, input: string) {
  if (!secret) return false;
  return safeEqual(secret, input);
}

export async function makeSessionCookie(secret: string, secure: boolean) {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const value = `${exp}.${await sign(secret, `session:${exp}`)}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(secure: boolean) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

export async function isLoggedIn(request: Request, secret: string | undefined) {
  if (!secret) return false;
  const cookie = request.headers.get('cookie') ?? '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9]+)\\.([0-9a-f]{64})`));
  if (!m) return false;
  const exp = Number(m[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(m[2], await sign(secret, `session:${exp}`));
}

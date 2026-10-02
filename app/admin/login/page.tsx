'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError('이메일 또는 비밀번호가 맞지 않습니다.');
      return;
    }
    router.replace('/admin');
    router.refresh();
  }

  return (
    <form className="login" onSubmit={onSubmit}>
      <h1>관리자 로그인</h1>
      <label className="field">
        <span>이메일</span>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="field">
        <span>비밀번호</span>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <p className="status err">{error}</p>}
      <button className="btn primary" type="submit" disabled={busy}>{busy ? '로그인 중…' : '로그인'}</button>
      <a className="hint" href="/">← 홈페이지로</a>
    </form>
  );
}

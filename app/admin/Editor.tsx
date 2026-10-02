'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import MediaView from '@/components/MediaView';
import type { ClassItem, Fact, GalleryItem, Media, MediaType, PriceItem, SiteContent, VideoItem } from '@/lib/content';
import { saveContent, signOut } from './actions';

const TABS = [
  ['basic', '기본 정보'],
  ['hero', '메인'],
  ['about', '학원소개'],
  ['space', '공간 사진'],
  ['video', '영상'],
  ['price', '수강료'],
  ['map', '위치'],
] as const;
type Tab = (typeof TABS)[number][0];

/* ───── 공통 입력 ───── */
function Text({ label, value, onChange, area, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; area?: boolean; placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {area ? (
        <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

/** 줄바꿈으로 구분된 목록 편집 (문단, 안내 문구 등) */
function Lines({ label, value, onChange, hint }: {
  label: string; value: string[]; onChange: (v: string[]) => void; hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value.join('\n')} onChange={(e) => onChange(e.target.value.split('\n'))} />
      {hint && <p className="hint">{hint}</p>}
    </label>
  );
}

/** 순서 변경·삭제·추가가 되는 반복 항목 편집 */
function List<T>({ items, onChange, make, title, render }: {
  items: T[]; onChange: (v: T[]) => void; make: () => T; title: (item: T, i: number) => string;
  render: (item: T, set: (next: T) => void) => React.ReactNode;
}) {
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="panel" style={{ paddingTop: 0 }}>
      {items.map((item, i) => (
        <div className="item" key={i}>
          <div className="item-head">
            <b>{title(item, i)}</b>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" className="mini" disabled={i === 0} onClick={() => move(i, -1)} aria-label="위로">↑</button>
              <button type="button" className="mini" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="아래로">↓</button>
              <button type="button" className="mini danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>삭제</button>
            </div>
          </div>
          {render(item, (next) => onChange(items.map((x, j) => (j === i ? next : x))))}
        </div>
      ))}
      <button type="button" className="add" onClick={() => onChange([...items, make()])}>+ 항목 추가</button>
    </div>
  );
}

/* ───── 업로드 ───── */
async function upload(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

function UploadButton({ accept, onDone, label = '파일 올리기' }: {
  accept: string; onDone: (url: string) => void; label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <label className="mini" style={{ padding: '8px 12px' }}>
        {busy ? '올리는 중…' : label}
        <input
          type="file" accept={accept} hidden disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setBusy(true); setErr('');
            try { onDone(await upload(f)); } catch (x) { setErr(`업로드 실패: ${(x as Error).message}`); }
            setBusy(false);
          }}
        />
      </label>
      {err && <span className="status err">{err}</span>}
    </div>
  );
}

/** 단일 이미지 URL 편집 (업로드 + 미리보기 + 삭제) */
function ImageField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string | undefined) => void }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="media-edit">
        {value && <div className="media-preview"><img src={value} alt="" /></div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <UploadButton accept="image/*" onDone={onChange} label={value ? '이미지 바꾸기' : '이미지 올리기'} />
          {value && <button type="button" className="mini danger" onClick={() => onChange(undefined)}>이미지 빼기</button>}
        </div>
      </div>
    </div>
  );
}

/** 이미지 / 영상 파일 / 유튜브 중 하나를 고르는 편집기 */
function MediaField({ label, value, onChange, allowEmpty }: {
  label: string; value: Media | null; onChange: (m: Media | null) => void; allowEmpty?: boolean;
}) {
  const m: Media = value ?? { type: 'image', url: '' };
  const set = (patch: Partial<Media>) => onChange({ ...m, ...patch });
  return (
    <div className="field">
      <span>{label}</span>
      <div className="media-edit">
        <div className="row2">
          <label className="field">
            <span>종류</span>
            <select value={m.type} onChange={(e) => set({ type: e.target.value as MediaType, url: '' })}>
              <option value="image">이미지</option>
              <option value="video">영상 파일 (mp4)</option>
              <option value="youtube">유튜브 링크</option>
            </select>
          </label>
          <Text label="대체 텍스트 (설명)" value={m.alt ?? ''} onChange={(v) => set({ alt: v })} />
        </div>
        {m.type === 'youtube' ? (
          <Text label="유튜브 주소" value={m.url} placeholder="https://www.youtube.com/watch?v=..." onChange={(v) => set({ url: v })} />
        ) : (
          <UploadButton
            accept={m.type === 'video' ? 'video/mp4,video/webm' : 'image/*'}
            onDone={(url) => set({ url })}
            label={m.url ? '파일 바꾸기' : '파일 올리기'}
          />
        )}
        {m.type === 'video' && <p className="hint">영상 파일은 50MB 이하 mp4를 권장합니다. 길거나 큰 영상은 유튜브에 올린 뒤 링크로 넣어 주세요.</p>}
        {m.url && <div className="media-preview"><MediaView media={m} /></div>}
        {allowEmpty && value && (
          <button type="button" className="mini danger" style={{ justifySelf: 'start' }} onClick={() => onChange(null)}>
            비우기 (기본 그림 사용)
          </button>
        )}
      </div>
    </div>
  );
}

/* ───── 편집기 ───── */
export default function Editor({ initial }: { initial: SiteContent }) {
  const [c, setC] = useState<SiteContent>(initial);
  const [tab, setTab] = useState<Tab>('basic');
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ text: string; err?: boolean }>({ text: '' });
  const [pending, startTransition] = useTransition();

  function update(fn: (draft: SiteContent) => void) {
    setC((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
    setStatus({ text: '' });
  }

  function save() {
    startTransition(async () => {
      const res = await saveContent(c);
      if (res.ok) {
        setDirty(false);
        setStatus({ text: '저장했습니다. 홈페이지에 바로 반영됩니다.' });
      } else {
        setStatus({ text: res.message ?? '저장하지 못했습니다.', err: true });
      }
    });
  }

  return (
    <div className="admin">
      <div className="admin-top">
        <h1>{c.brand.name} 관리자</h1>
        <div className="actions">
          <a className="mini" href="/" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', textDecoration: 'none' }}>홈페이지 보기</a>
          <form action={signOut}><button className="mini" type="submit" style={{ padding: '6px 12px' }}>로그아웃</button></form>
        </div>
      </div>

      <div className="admin-tabs" role="tablist">
        {TABS.map(([id, name]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{name}</button>
        ))}
      </div>

      {tab === 'basic' && (
        <div className="panel">
          <div className="row2">
            <Text label="학원 이름" value={c.brand.name} onChange={(v) => update((d) => { d.brand.name = v; })} />
            <Text label="영문 이름" value={c.brand.nameEn} onChange={(v) => update((d) => { d.brand.nameEn = v; })} />
          </div>
          <div className="row2">
            <Text label="전화번호" value={c.contact.phone} onChange={(v) => update((d) => { d.contact.phone = v; })} />
            <Text label="이메일" value={c.contact.email} onChange={(v) => update((d) => { d.contact.email = v; })} />
          </div>
          <Text label="인스타그램 주소" placeholder="https://www.instagram.com/..." value={c.contact.instagram} onChange={(v) => update((d) => { d.contact.instagram = v; })} />
          <Text label="블로그 주소" placeholder="https://blog.naver.com/..." value={c.contact.blog} onChange={(v) => update((d) => { d.contact.blog = v; })} />
          <Text label="카카오톡 채널 주소" placeholder="https://pf.kakao.com/..." value={c.contact.kakao} onChange={(v) => update((d) => { d.contact.kakao = v; })} />
          <p className="hint">비워 둔 링크는 홈페이지에 표시되지 않습니다.</p>
          <div className="row2">
            <Text label="대표자" value={c.business.owner} onChange={(v) => update((d) => { d.business.owner = v; })} />
            <Text label="사업자등록번호" value={c.business.bizNo} onChange={(v) => update((d) => { d.business.bizNo = v; })} />
          </div>
        </div>
      )}

      {tab === 'hero' && (
        <div className="panel">
          <Text label="작은 제목 (영문 권장)" value={c.hero.eyebrow} onChange={(v) => update((d) => { d.hero.eyebrow = v; })} />
          <Text label="큰 제목 (줄바꿈 가능)" area value={c.hero.title} onChange={(v) => update((d) => { d.hero.title = v; })} />
          <Text label="소개 문구" area value={c.hero.lead} onChange={(v) => update((d) => { d.hero.lead = v; })} />
          <Text label="상담 버튼 문구" value={c.hero.ctaLabel} onChange={(v) => update((d) => { d.hero.ctaLabel = v; })} />
          <MediaField
            label="대표 이미지 / 영상 (영상은 소리 없이 자동 반복 재생)"
            value={c.hero.media}
            allowEmpty
            onChange={(m) => update((d) => { d.hero.media = m; })}
          />
        </div>
      )}

      {tab === 'about' && (
        <div className="panel">
          <Lines label="소개 글" hint="한 줄이 한 문단입니다." value={c.about.paragraphs} onChange={(v) => update((d) => { d.about.paragraphs = v; })} />
          <ImageField label="소개 사진 (선택)" value={c.about.image} onChange={(v) => update((d) => { d.about.image = v; })} />
          <h3 style={{ fontSize: 16 }}>요약 정보</h3>
          <List<Fact>
            items={c.about.facts}
            onChange={(v) => update((d) => { d.about.facts = v; })}
            make={() => ({ label: '', value: '' })}
            title={(f, i) => f.label || `항목 ${i + 1}`}
            render={(f, set) => (
              <div className="row2">
                <Text label="제목" value={f.label} onChange={(v) => set({ ...f, label: v })} />
                <Text label="값" value={f.value} onChange={(v) => set({ ...f, value: v })} />
              </div>
            )}
          />
          <h3 style={{ fontSize: 16 }}>수업 과정</h3>
          <List<ClassItem>
            items={c.classes}
            onChange={(v) => update((d) => { d.classes = v; })}
            make={() => ({ tag: '', title: '', desc: '' })}
            title={(cl, i) => cl.title || `과정 ${i + 1}`}
            render={(cl, set) => (
              <>
                <div className="row2">
                  <Text label="과정명" value={cl.title} onChange={(v) => set({ ...cl, title: v })} />
                  <Text label="영문 태그" value={cl.tag} onChange={(v) => set({ ...cl, tag: v })} />
                </div>
                <Text label="설명" area value={cl.desc} onChange={(v) => set({ ...cl, desc: v })} />
                <ImageField label="사진 (선택)" value={cl.image} onChange={(v) => set({ ...cl, image: v })} />
              </>
            )}
          />
        </div>
      )}

      {tab === 'space' && (
        <div className="panel">
          <p className="hint">첫 번째 항목이 크게 표시됩니다. 화살표로 순서를 바꿀 수 있어요.</p>
          <List<GalleryItem>
            items={c.gallery}
            onChange={(v) => update((d) => { d.gallery = v; })}
            make={() => ({ title: '', caption: '', media: { type: 'image', url: '' } })}
            title={(g, i) => g.title || `사진 ${i + 1}`}
            render={(g, set) => (
              <>
                <div className="row2">
                  <Text label="공간 이름" value={g.title} onChange={(v) => set({ ...g, title: v })} />
                  <Text label="설명" value={g.caption} onChange={(v) => set({ ...g, caption: v })} />
                </div>
                <MediaField label="사진 / 영상" value={g.media} onChange={(m) => set({ ...g, media: m ?? { type: 'image', url: '' } })} />
              </>
            )}
          />
        </div>
      )}

      {tab === 'video' && (
        <div className="panel">
          <p className="hint">유튜브 주소를 넣으면 홈페이지에 &lsquo;영상&rsquo; 메뉴와 섹션이 생깁니다. 비우면 사라집니다.</p>
          <List<VideoItem>
            items={c.videos}
            onChange={(v) => update((d) => { d.videos = v; })}
            make={() => ({ title: '', url: '' })}
            title={(v, i) => v.title || `영상 ${i + 1}`}
            render={(v, set) => (
              <>
                <Text label="제목" value={v.title} onChange={(x) => set({ ...v, title: x })} />
                <Text label="유튜브 주소" placeholder="https://youtu.be/..." value={v.url} onChange={(x) => set({ ...v, url: x })} />
                {v.url && <div className="media-preview" style={{ aspectRatio: '16 / 9' }}><MediaView media={{ type: 'youtube', url: v.url }} /></div>}
              </>
            )}
          />
        </div>
      )}

      {tab === 'price' && (
        <div className="panel">
          <List<PriceItem>
            items={c.prices}
            onChange={(v) => update((d) => { d.prices = v; })}
            make={() => ({ name: '', detail: '', note: '', price: '' })}
            title={(p, i) => p.name || `과정 ${i + 1}`}
            render={(p, set) => (
              <>
                <div className="row2">
                  <Text label="과정" value={p.name} onChange={(v) => set({ ...p, name: v })} />
                  <Text label="수강료" placeholder="200,000원" value={p.price} onChange={(v) => set({ ...p, price: v })} />
                </div>
                <div className="row2">
                  <Text label="구성" value={p.detail} onChange={(v) => set({ ...p, detail: v })} />
                  <Text label="작은 안내 (선택)" value={p.note} onChange={(v) => set({ ...p, note: v })} />
                </div>
              </>
            )}
          />
          <Lines label="표 아래 안내 문구" hint="한 줄에 하나씩" value={c.priceNotes} onChange={(v) => update((d) => { d.priceNotes = v; })} />
        </div>
      )}

      {tab === 'map' && (
        <div className="panel">
          <Text label="주소" value={c.location.address} onChange={(v) => update((d) => { d.location.address = v; })} />
          <Lines label="대중교통 안내" hint="한 줄에 하나씩" value={c.location.transit} onChange={(v) => update((d) => { d.location.transit = v; })} />
          <Text label="주차 안내" area value={c.location.parking} onChange={(v) => update((d) => { d.location.parking = v; })} />
          <Text label="운영 시간" value={c.location.hours} onChange={(v) => update((d) => { d.location.hours = v; })} />
          <Text label="지도 링크 (네이버/카카오 지도 공유 주소)" value={c.location.mapUrl} onChange={(v) => update((d) => { d.location.mapUrl = v; })} />
          <ImageField label="약도 이미지 (선택, 없으면 기본 그림)" value={c.location.mapImage} onChange={(v) => update((d) => { d.location.mapImage = v; })} />
        </div>
      )}

      <div className="savebar">
        <span className={`status${status.err ? ' err' : ''}`}>{status.text || (dirty ? '저장하지 않은 변경 사항이 있습니다.' : '')}</span>
        <button type="button" className="btn primary" onClick={save} disabled={pending || !dirty}>
          {pending ? '저장 중…' : '저장하기'}
        </button>
      </div>
    </div>
  );
}

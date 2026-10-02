// 홈페이지 HTML을 만든다. 관리자가 저장할 때 한 번만 실행되고, 결과는 R2에 보관된다.
import { youtubeId, type Media, type SiteContent } from './content';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** 링크·파일 주소는 http(s), 사이트 내부 경로, tel, mailto만 허용 */
const safeUrl = (u: unknown) => {
  const s = String(u ?? '').trim();
  return /^(https?:\/\/|\/(?!\/)|tel:|mailto:)/i.test(s) ? esc(s) : '';
};

const nonEmpty = (list: string[]) => list.map((s) => s.trim()).filter(Boolean);

function media(m: Media | null | undefined, autoPlay = false): string {
  if (!m?.url) return '';
  const alt = esc(m.alt || '');
  if (m.type === 'youtube') {
    const id = youtubeId(m.url);
    if (!id) return '';
    const params = autoPlay ? `?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&playsinline=1` : '';
    return `<iframe src="https://www.youtube-nocookie.com/embed/${id}${params}" title="${alt || '영상'}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
  }
  const src = safeUrl(m.url);
  if (!src) return '';
  if (m.type === 'video') {
    return autoPlay
      ? `<video src="${src}" autoplay muted loop playsinline aria-label="${alt}"></video>`
      : `<video src="${src}" controls playsinline preload="metadata" aria-label="${alt}"></video>`;
  }
  return `<img src="${src}" alt="${alt}" loading="${autoPlay ? 'eager' : 'lazy'}">`;
}

// SNS 아이콘 (선 아이콘, 글자색을 따라감). 화면 낭독기에는 이름을 읽어 준다
const SOCIAL_ICONS: Record<string, string> = {
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/>',
  blog: '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4"/><path d="M8 12h8M8 16h5"/>',
  kakao: '<path d="M12 4C7 4 3 7.1 3 11c0 2.5 1.6 4.6 4 5.9L6 21l4.3-2.9c.6.1 1.1.1 1.7.1 5 0 9-3.1 9-7s-4-7-9-7z"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l5-2.8z" fill="currentColor"/>',
};

function iconLink(href: string, key: keyof typeof SOCIAL_ICONS, label: string, image?: string, external = true) {
  const u = safeUrl(href);
  if (!u) return '';
  const target = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  const img = safeUrl(image);
  const inner = img
    ? `<img src="${img}" alt="" width="20" height="20">`
    : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SOCIAL_ICONS[key]}</svg>`;
  return `<a class="icon-link" href="${u}"${target} aria-label="${esc(label)}" title="${esc(label)}">${inner}</a>`;
}

/** 홈 영상 카드: 처음엔 썸네일과 재생 버튼만, 누르면 그 자리에서 재생 */
function videoCard(v: { title: string; media: Media }): string {
  const label = esc(v.title || '영상');
  const play = `<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>`;
  if (v.media.type === 'youtube') {
    const id = youtubeId(v.media.url);
    if (!id) return '';
    return `<figure class="vcard"><button type="button" class="vthumb" data-yt="${id}" aria-label="${label} 재생">`
      + `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">${play}</button>`
      + (v.title ? `<figcaption>${esc(v.title)}</figcaption>` : '') + `</figure>`;
  }
  const src = safeUrl(v.media.url);
  if (!src) return '';
  return `<figure class="vcard"><button type="button" class="vthumb" data-src="${src}" aria-label="${label} 재생">`
    + `<video src="${src}#t=0.1" muted playsinline preload="metadata" tabindex="-1"></video>${play}</button>`
    + (v.title ? `<figcaption>${esc(v.title)}</figcaption>` : '') + `</figure>`;
}

const VIDEO_SCRIPT = `<script>
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('.vthumb');
  if (!b || document.body.classList.contains('is-preview')) return;
  var el;
  if (b.dataset.yt) {
    el = document.createElement('iframe');
    el.src = 'https://www.youtube-nocookie.com/embed/' + b.dataset.yt + '?autoplay=1&playsinline=1';
    el.allow = 'autoplay; encrypted-media; picture-in-picture';
    el.allowFullscreen = true;
    el.title = b.getAttribute('aria-label');
  } else {
    el = document.createElement('video');
    el.src = b.dataset.src; el.controls = true; el.autoplay = true; el.playsInline = true;
  }
  el.className = 'vplayer';
  b.replaceWith(el);
});
</script>`;

const KEYS = (() => {
  const black = [1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0];
  return `<div class="keys" aria-hidden="true">
    <div class="caption"><span>C4 — B5</span><span>♩ = 72</span></div>
    <div class="note">Andante</div>
    <div class="white">${black.map(() => '<span></span>').join('')}</div>
    <div class="black">${black.map((k) => `<span${k ? ' class="k"' : ''}></span>`).join('')}</div>
  </div>`;
})();

const MAP_SVG = `<svg viewBox="0 0 400 300" role="img" aria-label="약도">
  <rect width="400" height="300" fill="var(--surface)"/>
  <path d="M0 190 H400" stroke="var(--line)" stroke-width="18" fill="none"/>
  <path d="M150 0 V300" stroke="var(--line)" stroke-width="14" fill="none"/>
  <rect x="166" y="110" width="58" height="62" fill="var(--accent)"/>
  <text x="195" y="146" text-anchor="middle" font-size="12" fill="var(--accent-ink)">학원</text>
</svg>`;

// 관리자 미리보기용: 파일 주소를 사이트 기준으로 풀고, 메뉴(#about 등)는 미리보기 안에서만 스크롤되게 한다
// 관리자 미리보기용 스크립트
// - 링크를 눌러도 다른 페이지로 가지 않고, 메뉴(#about 등)는 미리보기 안에서만 스크롤
// - 관리자 화면과 메시지를 주고받아 스크롤 위치를 유지하고, 지금 편집 중인 탭에 해당하는 부분만 보여 준다
const PREVIEW_SCRIPT = `<style>
.pv-hidden{display:none!important}
.pv-empty{max-width:560px;margin:64px auto;padding:24px;border:1px dashed var(--line);color:var(--muted);text-align:center;font-size:14px}
</style>
<script>
(function () {
  var post = function (m) { try { parent.postMessage(m, '*'); } catch (e) {} };
  // 화면 조각: 상단, 메인, 학원소개, 공간, 영상, 수강료, 위치, 상담 연락처, 하단
  var parts = {
    header: document.querySelector('.site-header'), home: document.getElementById('home'),
    about: document.getElementById('about'), space: document.getElementById('space'), video: document.getElementById('video'),
    price: document.getElementById('price'), map: document.getElementById('map'),
    contact: document.getElementById('contact'), footer: document.querySelector('.site-footer')
  };
  var empty = document.createElement('p');
  empty.className = 'pv-empty pv-hidden';
  document.body.appendChild(empty);

  function focus(keys, emptyText) {
    var shown = 0;
    Object.keys(parts).forEach(function (k) {
      var el = parts[k];
      if (!el) return;
      var on = !keys || keys.indexOf(k) !== -1;
      el.classList.toggle('pv-hidden', !on);
      if (on) shown++;
    });
    var nothing = keys && !keys.some(function (k) { return parts[k]; });
    empty.textContent = emptyText || '';
    empty.classList.toggle('pv-hidden', !nothing);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    var h = a.getAttribute('href') || '';
    if (h.charAt(0) === '#') { var el = document.getElementById(h.slice(1)); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
  });
  var t = null;
  addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(function () { post({ type: 'pv-scrolled', y: scrollY }); }, 100); });
  addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.type === 'pv-scroll') scrollTo(0, d.y || 0);
    if (d.type === 'pv-focus') { focus(d.keys, d.empty); scrollTo(0, 0); }
    if (d.type === 'pv-goto') { var el = document.getElementById(d.id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
  });
  // 처음 그릴 때부터 관리자 화면이 정해 준 상태로 시작 (깜빡임 방지)
  var init = window.PV_INIT || {};
  if (init.keys) focus(init.keys, init.empty);
  if (init.y) scrollTo(0, init.y);
  post({ type: 'pv-ready' });
})();
</script>`;

// 페이지 목록. 상단 메뉴 순서이기도 하다
export const PAGES = [
  { key: 'home', path: '/', label: 'HOME', title: '' },
  { key: 'about', path: '/about', label: '학원소개', title: '학원소개' },
  { key: 'space', path: '/space', label: '공간', title: '공간' },
  { key: 'price', path: '/price', label: '수강료', title: '수강료' },
  { key: 'map', path: '/map', label: '위치', title: '오시는 길' },
] as const;
export type PageKey = (typeof PAGES)[number]['key'];

export function visiblePages(_c: SiteContent) {
  return PAGES;
}

export function renderPage(c: SiteContent, page: PageKey, origin = '', opts: { preview?: boolean } = {}): string {
  const tel = c.contact.phone.replace(/[^0-9+]/g, '');
  const videos = c.videos.filter((v) => (v.media.type === 'youtube' ? youtubeId(v.media.url) : safeUrl(v.media.url)));
  const year = new Date().getFullYear();
  const heroImg = c.hero.media?.type === 'image' ? safeUrl(c.hero.media.url) : '';
  const ogImage = heroImg.startsWith('/') ? esc(origin) + heroImg : heroImg;
  const desc = esc(c.hero.lead.slice(0, 140));
  const meta = PAGES.find((p) => p.key === page)!;
  const title = meta.title ? `${meta.title} | ${c.brand.name}` : c.brand.name;

  const icons = [
    c.contact.phone ? iconLink(`tel:${tel}`, 'phone', `전화 ${c.contact.phone}`, undefined, false) : '',
    c.contact.email ? iconLink(`mailto:${c.contact.email}`, 'mail', `메일 ${c.contact.email}`, undefined, false) : '',
    iconLink(c.contact.instagram, 'instagram', '인스타그램', c.contact.icons?.instagram),
    iconLink(c.contact.blog, 'blog', '네이버 블로그', c.contact.icons?.blog),
    iconLink(c.contact.kakao, 'kakao', '카카오톡 채널', c.contact.icons?.kakao),
    iconLink(c.contact.youtube, 'youtube', '유튜브', c.contact.icons?.youtube),
  ].join('');
  const info = (pairs: [string, string][]) =>
    pairs.filter(([, v]) => v).map(([k, v]) => `<span><em>${esc(k)}</em>${esc(v)}</span>`).join('');

  const nav = visiblePages(c)
    .map((p) => `<li><a href="${p.path}"${p.key === page ? ' aria-current="page"' : ''}>${esc(p.label)}</a></li>`)
    .join('');

  const sections: Record<PageKey, () => string> = {
    home: () => `
  <section class="banner" id="home" aria-label="대표 이미지">
    ${media(c.hero.media, true) || KEYS}
  </section>
  ${videos.length ? `<section class="wrap home-videos" id="videos" aria-label="영상">${videos.map(videoCard).join('')}</section>` : ''}
  <section class="wrap intro">
    ${c.hero.eyebrow ? `<div class="eyebrow">${esc(c.hero.eyebrow)}</div>` : ''}
    <h1>${esc(c.hero.title)}</h1>
    ${c.hero.lead ? `<p class="lead">${esc(c.hero.lead)}</p>` : ''}
    <a class="btn-line" href="/price">수강료 보기</a>
  </section>`,
    about: () => `
  <section class="section" id="about">
    <div class="wrap">
      <div class="sec-head"><h1>학원소개</h1><span class="eyebrow">About</span></div>
      <div class="about">
        <div>
          ${nonEmpty(c.about.paragraphs).map((p) => `<p>${esc(p)}</p>`).join('')}
          ${safeUrl(c.about.image) ? `<img class="about-img" src="${safeUrl(c.about.image)}" alt="" loading="lazy">` : ''}
        </div>
        <dl class="facts">
          ${c.about.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}
        </dl>
      </div>
      ${c.classes.length ? `<div class="classes">${c.classes
        .map(
          (cl) => `<div class="cls">
            ${safeUrl(cl.image) ? `<img src="${safeUrl(cl.image)}" alt="${esc(cl.title)}" loading="lazy">` : ''}
            <div class="tag">${esc(cl.tag)}</div>
            <h3>${esc(cl.title)}</h3>
            <p>${esc(cl.desc)}</p>
          </div>`,
        )
        .join('')}</div>` : ''}
    </div>
  </section>`,
    space: () => `
  <section class="section" id="space">
    <div class="wrap">
      <div class="sec-head"><h1>공간</h1><span class="eyebrow">Rooms</span></div>
      ${c.gallery.filter((g) => g.media?.url).length
        ? `<div class="gallery">${c.gallery
            .filter((g) => g.media?.url)
            .map(
              (g) => `<figure>
                <div class="frame">${media(g.media)}</div>
                <figcaption><b>${esc(g.title)}</b><span>${esc(g.caption)}</span></figcaption>
              </figure>`,
            )
            .join('')}</div>`
        : '<p class="empty">공간 사진을 준비 중입니다.</p>'}
    </div>
  </section>`,
    price: () => `
  <section class="section" id="price">
    <div class="wrap">
      <div class="sec-head"><h1>수강료</h1><span class="eyebrow">Tuition</span></div>
      <div class="table-wrap">
        <table class="price-table">
          <thead><tr><th>과정</th><th>구성</th><th class="price">수강료</th></tr></thead>
          <tbody>
            ${c.prices
              .map(
                (p) => `<tr>
                  <td>${esc(p.name)}</td>
                  <td>${esc(p.detail)}${p.note ? `<small>${esc(p.note)}</small>` : ''}</td>
                  <td class="price">${esc(p.price)}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
      ${nonEmpty(c.priceNotes).length ? `<ul class="note-list">${nonEmpty(c.priceNotes).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    </div>
  </section>`,
    map: () => `
  <section class="section" id="map">
    <div class="wrap">
      <div class="sec-head"><h1>오시는 길</h1><span class="eyebrow">Location</span></div>
      <div class="map">
        <div class="mapbox">
          ${safeUrl(c.location.mapImage) ? `<img src="${safeUrl(c.location.mapImage)}" alt="약도">` : MAP_SVG}
          ${safeUrl(c.location.mapUrl) ? `<a class="btn primary" href="${safeUrl(c.location.mapUrl)}" target="_blank" rel="noopener noreferrer">지도에서 보기</a>` : ''}
        </div>
        <div class="info">
          <dl>
            <div><dt>주소</dt><dd class="addr">${esc(c.location.address)}</dd></div>
            ${nonEmpty(c.location.transit).length ? `<div><dt>대중교통</dt><dd><ul>${nonEmpty(c.location.transit).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></dd></div>` : ''}
            ${c.location.parking ? `<div><dt>주차</dt><dd>${esc(c.location.parking)}</dd></div>` : ''}
            ${c.location.hours ? `<div><dt>운영 시간</dt><dd>${esc(c.location.hours)}</dd></div>` : ''}
          </dl>
        </div>
      </div>
    </div>
  </section>`,
  };

  return `<!doctype html>
<html lang="ko">
<head>
${opts.preview ? `<base href="${esc(origin)}/"><meta name="robots" content="noindex">` : ''}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${desc}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
${origin && !opts.preview ? `<link rel="canonical" href="${esc(origin)}${meta.path}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/site.css">
</head>
<body class="page-${page}${opts.preview ? ' is-preview' : ''}">
<header class="site-header">
  <div class="wrap head">
    <a class="logo" href="/">${esc(c.brand.name)}${c.brand.nameEn ? `<small>${esc(c.brand.nameEn)}</small>` : ''}</a>
    <nav class="site-nav" aria-label="주 메뉴">
      <ul>${nav}</ul>
    </nav>
  </div>
</header>

<main>${sections[page]()}
</main>

<section class="contact" id="contact">
  <div class="wrap contact-in">
    <h2>${esc(c.contact.title)}</h2>
    ${c.contact.desc ? `<p>${esc(c.contact.desc)}</p>` : ''}
    ${tel ? `<a class="btn-line" href="tel:${esc(tel)}">${esc(c.hero.ctaLabel || '상담 문의하기')}</a>` : ''}
  </div>
</section>

<footer class="site-footer">
  <div class="wrap foot">
    <div class="foot-info">
      <p>${info([['상호', c.brand.name], ['대표', c.business.owner], ['사업자등록번호', c.business.bizNo]])}</p>
      <p>${info([['주소', c.location.address], ['전화', c.contact.phone], ['이메일', c.contact.email]])}</p>
      <p class="copy">© ${year} ${esc(c.brand.nameEn || c.brand.name)}</p>
    </div>
    ${icons ? `<nav class="foot-icons" aria-label="연락처와 SNS">${icons}</nav>` : ''}
  </div>
</footer>
${page === 'home' && videos.length ? VIDEO_SCRIPT : ''}
${opts.preview ? PREVIEW_SCRIPT : ''}
</body>
</html>`;
}

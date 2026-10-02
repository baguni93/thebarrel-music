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
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/>',
  blog: '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4"/><path d="M8 12h8M8 16h5"/>',
  kakao: '<path d="M12 4C7 4 3 7.1 3 11c0 2.5 1.6 4.6 4 5.9L6 21l4.3-2.9c.6.1 1.1.1 1.7.1 5 0 9-3.1 9-7s-4-7-9-7z"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l5-2.8z" fill="currentColor"/>',
};

function socialLink(href: string, key: keyof typeof SOCIAL_ICONS, label: string) {
  const u = safeUrl(href);
  if (!u) return '';
  return `<a class="social" href="${u}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}" title="${esc(label)}">`
    + `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SOCIAL_ICONS[key]}</svg></a>`;
}

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

export function renderHome(c: SiteContent, origin = '', opts: { preview?: boolean } = {}): string {
  const tel = c.contact.phone.replace(/[^0-9+]/g, '');
  const videos = c.videos.filter((v) => youtubeId(v.url));
  const year = new Date().getFullYear();
  const heroImg = c.hero.media?.type === 'image' ? safeUrl(c.hero.media.url) : '';
  const ogImage = heroImg.startsWith('/') ? esc(origin) + heroImg : heroImg;
  const desc = esc(c.hero.lead.slice(0, 140));

  const socials = [
    socialLink(c.contact.instagram, 'instagram', '인스타그램'),
    socialLink(c.contact.blog, 'blog', '네이버 블로그'),
    socialLink(c.contact.kakao, 'kakao', '카카오톡 채널'),
    socialLink(c.contact.youtube, 'youtube', '유튜브'),
  ].join('');

  return `<!doctype html>
<html lang="ko">
<head>
${opts.preview ? `<base href="${esc(origin)}/"><meta name="robots" content="noindex">` : ''}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.brand.name)}</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(c.brand.name)}">
<meta property="og:description" content="${desc}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/site.css">
</head>
<body>
<header class="site-header">
  <div class="wrap head">
    <a class="logo" href="#home">${esc(c.brand.name)}${c.brand.nameEn ? `<small>${esc(c.brand.nameEn)}</small>` : ''}</a>
    <nav class="site-nav" aria-label="주 메뉴">
      <ul>
        <li><a href="#home">HOME</a></li>
        <li><a href="#about">학원소개</a></li>
        <li><a href="#space">공간</a></li>
        ${videos.length ? '<li><a href="#video">영상</a></li>' : ''}
        <li><a href="#price">수강료</a></li>
        <li><a href="#map">위치</a></li>
      </ul>
    </nav>
  </div>
</header>

<main>
  <div class="wrap hero" id="home">
    <div>
      <div class="eyebrow">${esc(c.hero.eyebrow)}</div>
      <h1>${esc(c.hero.title)}</h1>
      <p class="lead">${esc(c.hero.lead)}</p>
      <div class="btns">
        <a class="btn primary" href="${tel ? `tel:${esc(tel)}` : '#contact'}">${esc(c.hero.ctaLabel)}</a>
        <a class="btn" href="#price">수강료 보기</a>
      </div>
    </div>
    <div class="hero-media">${media(c.hero.media, true) || KEYS}</div>
  </div>

  <section class="section" id="about">
    <div class="wrap">
      <div class="sec-head"><h2>학원소개</h2><span class="eyebrow">About</span></div>
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
  </section>

  <section class="section" id="space">
    <div class="wrap">
      <div class="sec-head"><h2>공간</h2><span class="eyebrow">Rooms</span></div>
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
  </section>

  ${videos.length ? `<section class="section" id="video">
    <div class="wrap">
      <div class="sec-head"><h2>영상</h2><span class="eyebrow">Performance</span></div>
      <div class="videos">${videos
        .map(
          (v) => `<div>
            <div class="frame">${media({ type: 'youtube', url: v.url, alt: v.title })}</div>
            ${v.title ? `<p>${esc(v.title)}</p>` : ''}
          </div>`,
        )
        .join('')}</div>
    </div>
  </section>` : ''}

  <section class="section" id="price">
    <div class="wrap">
      <div class="sec-head"><h2>수강료</h2><span class="eyebrow">Tuition</span></div>
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
  </section>

  <section class="section" id="map">
    <div class="wrap">
      <div class="sec-head"><h2>오시는 길</h2><span class="eyebrow">Location</span></div>
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
  </section>
</main>

<div class="contact" id="contact">
  <div class="wrap contact-in">
    <div>
      <h2>${esc(c.contact.title)}</h2>
      ${c.contact.desc ? `<p>${esc(c.contact.desc)}</p>` : ''}
    </div>
    <div class="contact-links">
      <div class="chips">
        ${c.contact.phone ? `<a class="chip" href="tel:${esc(tel)}">전화 ${esc(c.contact.phone)}</a>` : ''}
        ${c.contact.email ? `<a class="chip" href="mailto:${esc(c.contact.email)}">메일 ${esc(c.contact.email)}</a>` : ''}
      </div>
      ${socials ? `<div class="socials">${socials}</div>` : ''}
    </div>
  </div>
</div>

<footer class="site-footer">
  <div class="wrap">
    <p>상호: ${esc(c.brand.name)} | 대표: ${esc(c.business.owner)} | 전화: ${esc(c.contact.phone)} | 이메일: ${esc(c.contact.email)}</p>
    <p>주소: ${esc(c.location.address)} | 사업자등록번호: ${esc(c.business.bizNo)}</p>
    <p class="copy">© ${year} ${esc(c.brand.name)} · <a href="/admin/">관리자</a></p>
  </div>
</footer>
${opts.preview ? PREVIEW_SCRIPT : ''}
</body>
</html>`;
}

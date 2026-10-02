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
const PREVIEW_SCRIPT = `<script>
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a');
  if (!a) return;
  e.preventDefault();
  var h = a.getAttribute('href') || '';
  if (h.charAt(0) === '#') { var el = document.getElementById(h.slice(1)); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
});
</script>`;

export function renderHome(c: SiteContent, origin = '', opts: { preview?: boolean } = {}): string {
  const tel = c.contact.phone.replace(/[^0-9+]/g, '');
  const videos = c.videos.filter((v) => youtubeId(v.url));
  const year = new Date().getFullYear();
  const heroImg = c.hero.media?.type === 'image' ? safeUrl(c.hero.media.url) : '';
  const ogImage = heroImg.startsWith('/') ? esc(origin) + heroImg : heroImg;
  const desc = esc(c.hero.lead.slice(0, 140));

  const link = (href: string, label: string) => {
    const u = safeUrl(href);
    return u ? `<a class="chip" href="${u}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : '';
  };

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
      <h2>상담은 편하게 연락 주세요</h2>
      <p>방문 전 미리 연락 주시면 상담 시간을 맞춰 두겠습니다.</p>
    </div>
    <div class="chips">
      ${c.contact.phone ? `<a class="chip" href="tel:${esc(tel)}">전화 ${esc(c.contact.phone)}</a>` : ''}
      ${c.contact.email ? `<a class="chip" href="mailto:${esc(c.contact.email)}">메일 ${esc(c.contact.email)}</a>` : ''}
      ${link(c.contact.instagram, '인스타그램')}
      ${link(c.contact.blog, '블로그')}
      ${link(c.contact.kakao, '카카오톡 상담')}
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

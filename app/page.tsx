/* eslint-disable @next/next/no-img-element */
import MediaView from '@/components/MediaView';
import { getContent } from '@/lib/getContent';
import { youtubeId } from '@/lib/content';

// 관리자 저장 시 revalidatePath('/')로 즉시 갱신되고, 그 외에는 1분마다 새로 읽는다
export const revalidate = 60;

function Keys() {
  const black = [1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0];
  return (
    <div className="keys" aria-hidden="true">
      <div className="caption"><span>C4 — B5</span><span>♩ = 72</span></div>
      <div className="note">Andante</div>
      <div className="white">{black.map((_, i) => <span key={i} />)}</div>
      <div className="black">{black.map((k, i) => <span key={i} className={k ? 'k' : ''} />)}</div>
    </div>
  );
}

export default async function Home() {
  const c = await getContent();
  const tel = c.contact.phone.replace(/[^0-9+]/g, '');
  const videos = c.videos.filter((v) => youtubeId(v.url));

  return (
    <>
      <header className="site-header">
        <div className="wrap head">
          <a className="logo" href="#home">
            {c.brand.name}
            {c.brand.nameEn && <small>{c.brand.nameEn}</small>}
          </a>
          <nav className="site-nav" aria-label="주 메뉴">
            <ul>
              <li><a href="#home">HOME</a></li>
              <li><a href="#about">학원소개</a></li>
              <li><a href="#space">공간</a></li>
              {videos.length > 0 && <li><a href="#video">영상</a></li>}
              <li><a href="#price">수강료</a></li>
              <li><a href="#map">위치</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap hero" id="home">
          <div>
            <div className="eyebrow">{c.hero.eyebrow}</div>
            <h1>{c.hero.title}</h1>
            <p className="lead">{c.hero.lead}</p>
            <div className="btns">
              <a className="btn primary" href={tel ? `tel:${tel}` : '#contact'}>{c.hero.ctaLabel}</a>
              <a className="btn" href="#price">수강료 보기</a>
            </div>
          </div>
          <div className="hero-media">
            {c.hero.media?.url ? <MediaView media={c.hero.media} autoPlay /> : <Keys />}
          </div>
        </div>

        <section className="section" id="about">
          <div className="wrap">
            <div className="sec-head"><h2>학원소개</h2><span className="eyebrow">About</span></div>
            <div className="about">
              <div>
                {c.about.paragraphs.filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                {c.about.image && <img className="about-img" src={c.about.image} alt="" />}
              </div>
              <dl className="facts">
                {c.about.facts.map((f, i) => (
                  <div key={i}><dt>{f.label}</dt><dd>{f.value}</dd></div>
                ))}
              </dl>
            </div>
            {c.classes.length > 0 && (
              <div className="classes">
                {c.classes.map((cl, i) => (
                  <div className="cls" key={i}>
                    {cl.image && <img src={cl.image} alt={cl.title} loading="lazy" />}
                    <div className="tag">{cl.tag}</div>
                    <h3>{cl.title}</h3>
                    <p>{cl.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="section" id="space">
          <div className="wrap">
            <div className="sec-head"><h2>공간</h2><span className="eyebrow">Rooms</span></div>
            {c.gallery.length > 0 ? (
              <div className="gallery">
                {c.gallery.map((g, i) => (
                  <figure key={i}>
                    <div className="frame"><MediaView media={g.media} /></div>
                    <figcaption><b>{g.title}</b><span>{g.caption}</span></figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="empty">공간 사진을 준비 중입니다.</p>
            )}
          </div>
        </section>

        {videos.length > 0 && (
          <section className="section" id="video">
            <div className="wrap">
              <div className="sec-head"><h2>영상</h2><span className="eyebrow">Performance</span></div>
              <div className="videos">
                {videos.map((v, i) => (
                  <div key={i}>
                    <div className="frame"><MediaView media={{ type: 'youtube', url: v.url, alt: v.title }} /></div>
                    {v.title && <p>{v.title}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="section" id="price">
          <div className="wrap">
            <div className="sec-head"><h2>수강료</h2><span className="eyebrow">Tuition</span></div>
            <div className="table-wrap">
              <table className="price-table">
                <thead><tr><th>과정</th><th>구성</th><th className="price">수강료</th></tr></thead>
                <tbody>
                  {c.prices.map((p, i) => (
                    <tr key={i}>
                      <td>{p.name}</td>
                      <td>{p.detail}{p.note && <small>{p.note}</small>}</td>
                      <td className="price">{p.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {c.priceNotes.length > 0 && (
              <ul className="note-list">{c.priceNotes.filter(Boolean).map((n, i) => <li key={i}>{n}</li>)}</ul>
            )}
          </div>
        </section>

        <section className="section" id="map">
          <div className="wrap">
            <div className="sec-head"><h2>오시는 길</h2><span className="eyebrow">Location</span></div>
            <div className="map">
              <div className="mapbox">
                {c.location.mapImage ? (
                  <img src={c.location.mapImage} alt="약도" />
                ) : (
                  <svg viewBox="0 0 400 300" role="img" aria-label="약도">
                    <rect width="400" height="300" fill="var(--surface)" />
                    <path d="M0 190 H400" stroke="var(--line)" strokeWidth="18" fill="none" />
                    <path d="M150 0 V300" stroke="var(--line)" strokeWidth="14" fill="none" />
                    <rect x="166" y="110" width="58" height="62" fill="var(--accent)" />
                    <text x="195" y="146" textAnchor="middle" fontSize="12" fill="var(--accent-ink)">학원</text>
                  </svg>
                )}
                {c.location.mapUrl && (
                  <a className="btn primary" href={c.location.mapUrl} target="_blank" rel="noopener noreferrer">지도에서 보기</a>
                )}
              </div>
              <div className="info">
                <dl>
                  <div><dt>주소</dt><dd className="addr">{c.location.address}</dd></div>
                  {c.location.transit.length > 0 && (
                    <div><dt>대중교통</dt><dd><ul>{c.location.transit.filter(Boolean).map((t, i) => <li key={i}>{t}</li>)}</ul></dd></div>
                  )}
                  {c.location.parking && <div><dt>주차</dt><dd>{c.location.parking}</dd></div>}
                  {c.location.hours && <div><dt>운영 시간</dt><dd>{c.location.hours}</dd></div>}
                </dl>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="contact" id="contact">
        <div className="wrap contact-in">
          <div>
            <h2>상담은 편하게 연락 주세요</h2>
            <p>방문 전 미리 연락 주시면 상담 시간을 맞춰 두겠습니다.</p>
          </div>
          <div className="chips">
            {c.contact.phone && <a className="chip" href={`tel:${tel}`}>전화 {c.contact.phone}</a>}
            {c.contact.email && <a className="chip" href={`mailto:${c.contact.email}`}>메일 {c.contact.email}</a>}
            {c.contact.instagram && <a className="chip" href={c.contact.instagram} target="_blank" rel="noopener noreferrer">인스타그램</a>}
            {c.contact.blog && <a className="chip" href={c.contact.blog} target="_blank" rel="noopener noreferrer">블로그</a>}
            {c.contact.kakao && <a className="chip" href={c.contact.kakao} target="_blank" rel="noopener noreferrer">카카오톡 상담</a>}
          </div>
        </div>
      </div>

      <footer className="site-footer">
        <div className="wrap">
          <p>상호: {c.brand.name} | 대표: {c.business.owner} | 전화: {c.contact.phone} | 이메일: {c.contact.email}</p>
          <p>주소: {c.location.address} | 사업자등록번호: {c.business.bizNo}</p>
          <p style={{ marginTop: 10 }}>© {new Date().getFullYear()} {c.brand.name} · <a href="/admin">관리자</a></p>
        </div>
      </footer>
    </>
  );
}

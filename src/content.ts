// 홈페이지에 표시되는 모든 내용. 관리자 화면에서 이 구조 그대로 편집해 R2의 content.json 으로 저장한다.

export type MediaType = 'image' | 'video' | 'youtube';
export type Media = { type: MediaType; url: string; alt?: string };

export type Fact = { label: string; value: string };
export type ClassItem = { tag: string; title: string; desc: string; image?: string };
export type GalleryItem = { title: string; caption: string; media: Media };
export type VideoItem = { title: string; media: Media }; // 홈에 나오는 영상 (유튜브 링크 또는 mp4 파일)
export type PriceItem = { name: string; detail: string; note: string; price: string };

export type SiteContent = {
  brand: { name: string; nameEn: string };
  hero: { eyebrow: string; title: string; lead: string; ctaLabel: string; media: Media | null };
  about: { paragraphs: string[]; facts: Fact[]; image?: string };
  classes: ClassItem[];
  gallery: GalleryItem[];
  videos: VideoItem[];
  prices: PriceItem[];
  priceNotes: string[];
  location: {
    address: string;
    transit: string[];
    parking: string;
    hours: string;
    mapUrl: string;
    mapImage?: string;
  };
  contact: {
    title: string; // 상담 안내 제목
    desc: string; // 상담 안내 문구
    phone: string;
    email: string;
    instagram: string;
    blog: string;
    kakao: string;
    youtube: string; // 유튜브 채널 주소
    // SNS별로 올린 로고 이미지 주소 (비우면 기본 선 아이콘)
    icons?: { instagram?: string; blog?: string; kakao?: string; youtube?: string };
  };
  business: { owner: string; bizNo: string };
};

export const defaultContent: SiteContent = {
  brand: { name: '더베럴 뮤직', nameEn: 'THE BARREL MUSIC' },
  hero: {
    eyebrow: 'Piano · Vocal · Guitar',
    title: '오래 묵힐수록 깊어지는 소리,\n더베럴 뮤직',
    lead: '오크통에서 천천히 익어가는 것처럼, 서두르지 않고 한 사람의 속도에 맞춰 가르칩니다. 처음 건반을 누르는 분부터 무대를 준비하는 분까지 1:1로 함께합니다.',
    ctaLabel: '상담 문의하기',
    media: null,
  },
  about: {
    paragraphs: [
      '더베럴 뮤직은 취미로 음악을 시작하려는 성인과 입시·오디션을 준비하는 학생을 위한 1:1 레슨 학원입니다.',
      '정해진 교재 진도보다 지금 치고 싶은 곡, 부르고 싶은 노래에서 출발합니다. 첫 상담에서 목표와 수준을 함께 정리하고, 매 레슨 끝에 다음 주 연습 분량을 구체적으로 정해 드립니다.',
    ],
    facts: [
      { label: '레슨 방식', value: '1 : 1' },
      { label: '1회 레슨', value: '50분' },
      { label: '개인 연습실', value: '6실' },
      { label: '운영 시간', value: '10–22시' },
    ],
  },
  classes: [
    { tag: 'PIANO', title: '피아노', desc: '클래식, 재즈, 반주법까지. 악보를 처음 보는 분도 첫 달 안에 한 곡을 완성하는 것을 목표로 합니다.' },
    { tag: 'VOCAL', title: '보컬', desc: '호흡과 발성 기초부터 녹음 모니터링까지. 자기 음역에 맞는 곡 선정을 함께합니다.' },
    { tag: 'GUITAR', title: '기타', desc: '통기타 코드 반주와 핑거스타일. 좋아하는 노래 한 곡으로 시작합니다.' },
  ],
  gallery: [],
  videos: [],
  prices: [
    { name: '피아노 주 1회', detail: '1:1 레슨 50분 × 4회', note: '연습실 자유 이용', price: '200,000원' },
    { name: '피아노 주 2회', detail: '1:1 레슨 50분 × 8회', note: '연습실 자유 이용', price: '360,000원' },
    { name: '보컬 / 기타 주 1회', detail: '1:1 레슨 50분 × 4회', note: '', price: '220,000원' },
    { name: '연습실 단독 이용', detail: '4주 무제한 (운영 시간 내)', note: '', price: '80,000원' },
  ],
  priceNotes: ['수강료는 4주 기준, VAT 포함입니다.', '첫 상담과 수준 체크는 무료입니다.'],
  location: {
    address: '서울 ○○구 ○○로 00, 2층',
    transit: ['지하철 ○○역 2번 출구에서 도보 4분', '버스 ○○정류장 하차 후 도보 2분'],
    parking: '건물 지하 주차장 1시간 무료',
    hours: '평일 10:00–22:00 · 토요일 10:00–18:00 · 일요일 휴무',
    mapUrl: 'https://map.naver.com',
  },
  contact: {
    title: '상담은 편하게 연락 주세요',
    desc: '방문 전 미리 연락 주시면 상담 시간을 맞춰 두겠습니다.',
    phone: '010-0000-0000',
    email: 'hello@thebarrel.kr',
    instagram: '',
    blog: '',
    kakao: '',
    youtube: '',
    icons: {},
  },
  business: { owner: '○○○', bizNo: '000-00-00000' },
};

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const arr = <T>(v: unknown, d: T[]): T[] => (Array.isArray(v) ? (v as T[]) : d);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** 예전 형식({ title, url } = 유튜브 링크)으로 저장된 영상도 새 형식으로 바꿔 읽는다 */
function normalizeVideo(v: Record<string, unknown>): VideoItem | null {
  if (!v || typeof v !== 'object') return null;
  const title = str(v.title);
  const m = obj(v.media);
  if (m.url !== undefined || m.type !== undefined) {
    const type = m.type === 'video' ? 'video' : 'youtube';
    return { title, media: { type, url: str(m.url), alt: str(m.alt) || undefined } };
  }
  return { title, media: { type: 'youtube', url: str(v.url) } };
}

/** 저장된 값이 일부 비어 있거나 모양이 틀려도 화면이 깨지지 않도록 기본값과 합친다 */
export function withDefaults(raw: unknown): SiteContent {
  const c = obj(raw) as Partial<SiteContent>;
  const d = defaultContent;
  return {
    brand: { ...d.brand, ...obj(c.brand) },
    hero: { ...d.hero, ...obj(c.hero) } as SiteContent['hero'],
    about: { ...d.about, ...obj(c.about) } as SiteContent['about'],
    classes: arr(c.classes, d.classes),
    gallery: arr(c.gallery, d.gallery),
    videos: arr<Record<string, unknown>>(c.videos, []).map(normalizeVideo).filter((v): v is VideoItem => !!v),
    prices: arr(c.prices, d.prices),
    priceNotes: arr(c.priceNotes, d.priceNotes),
    location: { ...d.location, ...obj(c.location) } as SiteContent['location'],
    contact: { ...d.contact, ...obj(c.contact) },
    business: { ...d.business, ...obj(c.business) },
  };
}

export function youtubeId(url: string): string | null {
  const m = str(url).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

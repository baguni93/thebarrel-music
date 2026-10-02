import { youtubeId, type Media } from '@/lib/content';

/** 이미지 · 업로드 영상 · 유튜브를 같은 방식으로 표시 */
export default function MediaView({ media, autoPlay = false }: { media: Media; autoPlay?: boolean }) {
  if (!media?.url) return null;
  if (media.type === 'youtube') {
    const id = youtubeId(media.url);
    if (!id) return null;
    const params = autoPlay ? `?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&playsinline=1` : '';
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}${params}`}
        title={media.alt || '영상'}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    );
  }
  if (media.type === 'video') {
    return autoPlay ? (
      <video src={media.url} autoPlay muted loop playsInline aria-label={media.alt} />
    ) : (
      <video src={media.url} controls playsInline preload="metadata" aria-label={media.alt} />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={media.url} alt={media.alt || ''} loading="lazy" />;
}

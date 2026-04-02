import type { ReactNode } from 'react';
import styles from './card.module.css';

export type GameCardVariant = 'hero' | 'small' | 'medium';

export interface GameCardProps {
  variant?: GameCardVariant;
  title: string;
  subtitle: string;
  /** Mini preview (e.g. Word Search grid). When set, `imageSrc` is ignored. */
  preview?: ReactNode;
  /** Preview image path (e.g. `/previews/klondike.png`). Omit when using `preview`. */
  imageSrc?: string;
  imageAlt: string;
  playLabel: string;
  bestScore?: number;
  onPlay: () => void;
}

export function GameCard({
  variant = 'small',
  title,
  subtitle,
  preview,
  imageSrc,
  imageAlt,
  playLabel,
  bestScore,
  onPlay,
}: GameCardProps) {
  const isHero = variant === 'hero';

  const cardClass = [
    styles.card,
    variant === 'hero' && styles.variantHero,
    variant === 'small' && styles.variantSmall,
    variant === 'medium' && styles.variantMedium,
  ]
    .filter(Boolean)
    .join(' ');

  const mediaClass = [
    styles.media,
    variant === 'hero' && styles.mediaHero,
    variant === 'small' && styles.mediaSmall,
    variant === 'medium' && styles.mediaMedium,
  ]
    .filter(Boolean)
    .join(' ');

  const bodyClass = [
    styles.body,
    variant === 'hero' && styles.bodyHero,
    variant === 'small' && styles.bodySmall,
    variant === 'medium' && styles.bodyMedium,
  ]
    .filter(Boolean)
    .join(' ');

  const playClass = [styles.playBtn, isHero ? styles.playBtnHero : styles.playBtnCompact]
    .filter(Boolean)
    .join(' ');

  const titleClass = [styles.title, isHero ? styles.titleHero : styles.titleCompact]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClass}>
      <div
        className={mediaClass}
        onClick={onPlay}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPlay();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`${playLabel}: ${title}`}
      >
        {preview ? (
          <div className={styles.previewCustom}>{preview}</div>
        ) : (
          imageSrc && (
            <img
              src={imageSrc}
              alt={imageAlt}
              className={styles.previewImage}
              loading="lazy"
            />
          )
        )}
      </div>

      <div className={bodyClass}>
        <div className={styles.content}>
          <h3 className={titleClass}>{title}</h3>
          <p className={styles.subtitle}>{subtitle}</p>
          {bestScore != null && (
            <p className={styles.best}>Best: {bestScore}</p>
          )}
        </div>

        <button type="button" className={playClass} onClick={onPlay}>
          {playLabel}
        </button>
      </div>
    </article>
  );
}

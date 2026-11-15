import type { BandPositionName, MoneyJson } from '@paylens/shared';

const SHAPE: Record<BandPositionName, string> = {
  below: '▲',
  within: '●',
  above: '◆',
};
const COLOUR: Record<BandPositionName, string> = {
  below: 'text-below',
  within: 'text-teal',
  above: 'text-above',
};
const LABEL: Record<BandPositionName, string> = {
  below: 'Below band',
  within: 'Within band',
  above: 'Above band',
};

/** Share of the bar left on each side of the band, so outliers stay visible. */
const EDGE_PERCENT = 10;

/**
 * PayLens's signature element (ui.md → design plan): a track from the band's minimum to its
 * maximum, a tick at mid and a marker for the person. Position is never colour alone: the
 * marker's shape differs (▲ below, ● within, ◆ above) and the accessible name says it.
 */
export function BandBar({
  band,
  position,
  compaRatio,
  rangePenetration,
  size = 'sm',
}: {
  band: { min: MoneyJson; mid: MoneyJson; max: MoneyJson };
  position: BandPositionName;
  compaRatio: number;
  rangePenetration: number;
  /** sm: a directory row (96 px) · lg: the profile. */
  size?: 'sm' | 'lg';
}) {
  const midLeft = alongTheBar(shareOfRange(band));
  const markerLeft = Math.min(100, Math.max(0, alongTheBar(rangePenetration)));
  const label = [
    LABEL[position],
    `compa-ratio ${compaRatio.toFixed(2)}`,
    ...(position === 'within'
      ? [`${Math.round(rangePenetration * 100)}% of the way from min to max`]
      : []),
  ].join(' · ');

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative ${size === 'sm' ? 'h-4 w-24' : 'h-6 w-full max-w-[480px]'}`}
    >
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-teal-soft"
        style={{ left: `${EDGE_PERCENT}%`, right: `${EDGE_PERCENT}%` }}
      />
      <div
        data-testid="band-mid"
        className="absolute top-0 h-full w-px bg-ink/40"
        style={{ left: `${midLeft}%` }}
      />
      <span
        data-testid="band-marker"
        aria-hidden="true"
        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 leading-none ${COLOUR[position]} ${size === 'sm' ? 'text-xs' : 'text-base'}`}
        style={{ left: `${markerLeft}%` }}
      >
        {SHAPE[position]}
      </span>
    </div>
  );
}

/** 0 → the band's minimum, 1 → its maximum, as a left offset in % of the whole bar. */
function alongTheBar(share: number): number {
  return (
    Math.round((EDGE_PERCENT + (100 - 2 * EDGE_PERCENT) * share) * 100) / 100
  );
}

/**
 * Where mid sits between min and max, for drawing only. Converting to Number here is safe:
 * this is a screen position, not money arithmetic, and the API computed the metrics exactly.
 */
function shareOfRange(band: {
  min: MoneyJson;
  mid: MoneyJson;
  max: MoneyJson;
}): number {
  const min = Number(band.min.amountMinor);
  const width = Number(band.max.amountMinor) - min;
  return width === 0 ? 0.5 : (Number(band.mid.amountMinor) - min) / width;
}

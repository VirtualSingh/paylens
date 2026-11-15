import { render, screen } from '@testing-library/react';
import { BandBar } from './band-bar';

const inr = (rupees: number) => ({
  amountMinor: String(rupees * 100),
  currency: 'INR',
});
const band = { min: inr(2_400_000), mid: inr(3_000_000), max: inr(3_600_000) };

describe('BandBar', () => {
  it('describes where the person sits in words, not only by colour', () => {
    render(
      <BandBar
        band={band}
        position="within"
        compaRatio={0.95}
        rangePenetration={0.375}
      />,
    );

    expect(
      screen.getByRole('img', {
        name: 'Within band · compa-ratio 0.95 · 38% of the way from min to max',
      }),
    ).toBeInTheDocument();
  });

  it.each([
    ['below', '▲', 'Below band · compa-ratio 0.73'],
    [
      'within',
      '●',
      'Within band · compa-ratio 0.95 · 38% of the way from min to max',
    ],
    ['above', '◆', 'Above band · compa-ratio 1.25'],
  ] as const)('marks %s band with %s', (position, shape, label) => {
    render(
      <BandBar
        band={band}
        position={position}
        compaRatio={
          position === 'below' ? 0.7333 : position === 'above' ? 1.25 : 0.95
        }
        rangePenetration={
          position === 'below' ? -0.1667 : position === 'above' ? 1.0833 : 0.375
        }
      />,
    );

    expect(screen.getByRole('img', { name: label })).toHaveTextContent(shape);
  });

  it('places the mid tick where mid sits between min and max', () => {
    render(
      <BandBar
        band={{ min: inr(1_000_000), mid: inr(1_600_000), max: inr(2_000_000) }}
        position="within"
        compaRatio={1}
        rangePenetration={0.6}
      />,
    );

    // The track (min → max) is the middle 80% of the bar; 60% along it is 10 + 48 = 58%.
    expect(screen.getByTestId('band-mid')).toHaveStyle({ left: '58%' });
    expect(screen.getByTestId('band-marker')).toHaveStyle({ left: '58%' });
  });

  it('keeps a far outlier on the bar, at its edge', () => {
    render(
      <BandBar
        band={band}
        position="above"
        compaRatio={2}
        rangePenetration={3}
      />,
    );

    expect(screen.getByTestId('band-marker')).toHaveStyle({ left: '100%' });
  });
});

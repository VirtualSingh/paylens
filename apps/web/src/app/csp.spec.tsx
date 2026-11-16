import { createHash } from 'node:crypto';
import { screen } from '@testing-library/react';
import { renderRoute } from '../testing/render-route';
// The deployed headers, as text (Vite's ?raw import).
import vercelJson from '../../vercel.json?raw';

/** style-src of the Content-Security-Policy the web app is served with (vercel.json). */
function allowedStyles(): string[] {
  const csp = vercelJson.match(/style-src ([^;"]*)/)?.[1] ?? '';
  return csp.split(' ');
}

const hashOf = (text: string) =>
  `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

describe('Content-Security-Policy (D-8)', () => {
  it('allows, by hash, every style the libraries inject at runtime', async () => {
    // As in the browser: Tailwind's reset leaves body without margins, and the shell scrolls
    // its main area, never the page, so the dialog's scroll lock computes a 0 px gap.
    document.body.style.margin = '0';
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: window.innerWidth,
    });
    const { user } = renderRoute('/');
    await screen.findByRole('navigation', { name: 'Main' });

    await user.keyboard('{Control>}k{/Control}'); // a Radix dialog: locks scrolling
    await screen.findByRole('dialog');
    const injected = [...document.querySelectorAll('style')].map((style) =>
      hashOf(style.textContent ?? ''),
    );

    expect(injected.length).toBeGreaterThan(0);
    for (const hash of injected) {
      expect(allowedStyles()).toContain(hash);
    }
  });
});

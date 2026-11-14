import { render, screen, within } from '@testing-library/react';
import { axeViolations } from '../testing/axe';
import { App } from './app';

describe('App shell', () => {
  it('names the product', () => {
    render(<App />);

    expect(screen.getByText('PayLens')).toBeInTheDocument();
  });

  it('lists the main sections in the order of ui-screens.md', () => {
    render(<App />);

    const navigation = screen.getByRole('navigation', { name: 'Main' });
    const sections = within(navigation)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(sections).toEqual([
      'Dashboard',
      'People',
      'Pay bands',
      'Imports',
      'Audit log',
      'Settings',
    ]);
  });

  it.each([
    ['Dashboard', '/'],
    ['People', '/people'],
    ['Pay bands', '/pay-bands'],
    ['Imports', '/imports'],
    ['Audit log', '/audit'],
    ['Settings', '/settings'],
  ])('links %s to %s', (section, path) => {
    render(<App />);

    expect(screen.getByRole('link', { name: section })).toHaveAttribute(
      'href',
      path,
    );
  });

  it('gives page content its own main region', () => {
    render(<App />);

    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<App />);

    expect(await axeViolations(container)).toEqual([]);
  });
});

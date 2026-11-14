import axe from 'axe-core';

/**
 * Runs axe-core's WCAG 2.x A/AA rules on a rendered subtree and returns one readable line
 * per violation, so `expect(await axeViolations(container)).toEqual([])` fails with a
 * message that says what is wrong. jsdom has no layout, so colour contrast is checked in
 * the Playwright journeys instead.
 */
export async function axeViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
  });
  return results.violations.map(
    (violation) => `${violation.id}: ${violation.help}`,
  );
}

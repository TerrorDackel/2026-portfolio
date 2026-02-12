import { routes } from './app.routes';

/**
 * Unit tests for the application's route configuration.
 *
 * These tests ensure that:
 * - All expected route paths exist.
 * - The wildcard route redirects unknown paths back to the home route.
 */
describe('app routes', () => {
  it('defines the expected route paths', () => {
    const paths = routes.map(route => route.path);

    expect(paths).toContain('');
    expect(paths).toContain('legal-notice');
    expect(paths).toContain('privacy-policy');
    expect(paths).toContain('**');
  });

  it('redirects unknown paths to the home route', () => {
    const wildcard = routes.find(route => route.path === '**');

    expect(wildcard?.redirectTo).toBe('');
  });
});

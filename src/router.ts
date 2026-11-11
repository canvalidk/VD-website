import { useEffect, useState } from 'react';

/**
 * Hash routes, so the static site needs one HTML file and no server rewrites.
 * The workshop is for local iteration only and never appears in a production build.
 */
export type Page = 'home' | 'dictionary' | 'traces' | 'ideas' | 'workshop';
export interface Route { page: Page; params: URLSearchParams }

export const workshopEnabled = (dev: boolean) => dev;
const pages: Page[] = ['home', 'dictionary', 'traces', 'ideas', 'workshop'];

/** '#/dictionary?d=newton-current' → { page: 'dictionary', params: d=newton-current }. Unknown paths go home. */
export function parseRoute(hash: string, dev: boolean): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const page = (pages as string[]).includes(path) ? path as Page : 'home';
  return { page: page === 'workshop' && !workshopEnabled(dev) ? 'home' : page, params: new URLSearchParams(query) };
}

export function routeHash(page: Page, params: Record<string, string | undefined> = {}): string {
  const query = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => !!entry[1])).toString();
  return `#/${page === 'home' ? '' : page}${query ? `?${query}` : ''}`;
}

export function useRoute(): Route {
  const dev = import.meta.env.DEV;
  const [route, setRoute] = useState(() => parseRoute(window.location.hash, dev));
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash, dev));
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, [dev]);
  return route;
}

export function navigate(page: Page, params: Record<string, string | undefined> = {}) {
  const hash = routeHash(page, params);
  if (window.location.hash !== hash) window.location.hash = hash;
}

/**
 * Base path for files in `public/`.
 * The exported site lives under "/signova" on GitHub Pages, so its public files do too.
 * The dev server serves `public/` from the root even with a baseUrl, so there it is "".
 */
const RAW = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
export const BASE = process.env.NODE_ENV === 'production' ? RAW : '';

/** URL of a file in `public/` that works locally and under the GitHub Pages sub-path. */
export const assetUrl = (p: string) => `${BASE}/${p.replace(/^\//, '')}`;

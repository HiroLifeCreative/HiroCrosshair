/**
 * Resolves a cover/thumbnail image URL for a given game name.
 * Uses the public FreeToGame API (no auth required).
 *   docs: https://www.freetogame.com/api-doc
 *
 * Strategy:
 *  - Lazy-load the full game catalog once and cache it in localStorage (24h TTL).
 *  - Fuzzy-match the input name against the catalog.
 *  - Falls back to `null` if no match.
 */

interface FtgGame {
  id: number;
  title: string;
  thumbnail: string;
  short_description?: string;
  game_url?: string;
  genre?: string;
  platform?: string;
  publisher?: string;
  developer?: string;
}

const CATALOG_KEY = "hiro.gameart.catalog.v1";
const CATALOG_TTL = 24 * 60 * 60 * 1000; // 24h
const ART_CACHE_KEY = "hiro.gameart.lookup.v1";

interface CatalogCache {
  ts: number;
  games: FtgGame[];
}

let inMem: FtgGame[] | null = null;
let loading: Promise<FtgGame[]> | null = null;

async function loadCatalog(): Promise<FtgGame[]> {
  if (inMem) return inMem;
  if (loading) return loading;

  // Try localStorage cache first
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CatalogCache;
      if (Date.now() - parsed.ts < CATALOG_TTL && Array.isArray(parsed.games)) {
        inMem = parsed.games;
        return inMem;
      }
    }
  } catch {
    /* ignore */
  }

  loading = (async () => {
    try {
      const resp = await fetch("https://www.freetogame.com/api/games", {
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const games = (await resp.json()) as FtgGame[];
      const cache: CatalogCache = { ts: Date.now(), games };
      try {
        localStorage.setItem(CATALOG_KEY, JSON.stringify(cache));
      } catch {
        /* ignore quota */
      }
      inMem = games;
      return games;
    } catch (e) {
      console.warn("[gameArt] catalog fetch failed:", e);
      inMem = [];
      return [];
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Read/write a per-name lookup cache (saves repeated fuzzy-matches). */
function readArtCache(): Record<string, string | null> {
  try {
    const raw = localStorage.getItem(ART_CACHE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string | null>;
  } catch {
    /* ignore */
  }
  return {};
}
function writeArtCache(map: Record<string, string | null>) {
  try {
    localStorage.setItem(ART_CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Normalize for matching: lowercase, strip non-alnum. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function score(query: string, candidate: string): number {
  const q = norm(query);
  const c = norm(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1000;
  if (c.startsWith(q)) return 800 - (c.length - q.length);
  if (c.includes(q)) return 600 - (c.length - q.length);
  if (q.includes(c)) return 500 - (q.length - c.length);
  // Token overlap
  const qt = new Set(q.match(/.{2,}/g) ?? []);
  const ct = new Set(c.match(/.{2,}/g) ?? []);
  let overlap = 0;
  qt.forEach((t) => {
    if (ct.has(t)) overlap += 1;
  });
  return overlap > 0 ? 100 + overlap : 0;
}

/**
 * Returns the best-matching cover URL for `name`, or null if not found.
 */
export async function getGameCover(name: string): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const cache = readArtCache();
  if (name in cache) return cache[name];

  const games = await loadCatalog();
  let bestUrl: string | null = null;
  let bestScore = 0;
  for (const g of games) {
    const s = score(name, g.title);
    if (s > bestScore) {
      bestScore = s;
      bestUrl = g.thumbnail;
    }
  }
  // Threshold: avoid garbage matches
  if (bestScore < 100) bestUrl = null;

  cache[name] = bestUrl;
  writeArtCache(cache);
  return bestUrl;
}

/** Synchronous lookup from the persistent cache only (no network). */
export function getCachedGameCover(name: string): string | null | undefined {
  const cache = readArtCache();
  return cache[name];
}

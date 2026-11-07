export interface LyricSyllable {
  text: string;
  isPartOfWord?: boolean;
  startTime: number;
  endTime: number;
}

export interface LyricBackgroundItem {
  id: string;
  time: number;
  endTime?: number;
  text: string;
  syllables?: LyricSyllable[];
}

export interface LyricDisplayItem {
  id: string;
  time: number;
  endTime?: number;
  text: string;
  isInterlude: boolean;
  oppositeAligned?: boolean;
  syllables?: LyricSyllable[];
  background?: LyricBackgroundItem[];
}

// Client-side cache for parsed word-by-word (wbw) lyrics
export const clientLyricsCache = new Map<string, LyricDisplayItem[] | null>();
export const WBW_LYRICS_STORAGE_PREFIX = 'wbw_lyrics_v1:';
export const WBW_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getTrackLyricsCacheKey(track: any): string {
  if (track?.id) return `id_${track.id}`;
  const artist = (track?.artist || '').toLowerCase().trim();
  const name = (track?.name || '').toLowerCase().trim();
  return `${artist}::${name}`;
}

export function getCachedWbwLyrics(track: any): LyricDisplayItem[] | null | undefined {
  if (!track) return undefined;
  const key = getTrackLyricsCacheKey(track);

  // 1. Fast in-memory lookup (0ms)
  if (clientLyricsCache.has(key)) {
    return clientLyricsCache.get(key);
  }

  // 2. Persistent storage lookup (survives browser refreshes)
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${WBW_LYRICS_STORAGE_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ts && Date.now() - parsed.ts < WBW_CACHE_TTL_MS) {
          clientLyricsCache.set(key, parsed.items);
          return parsed.items;
        } else {
          localStorage.removeItem(`${WBW_LYRICS_STORAGE_PREFIX}${key}`);
        }
      }
    } catch {}
  }

  return undefined;
}

export function setCachedWbwLyrics(track: any, items: LyricDisplayItem[] | null): void {
  if (!track) return;
  const key = getTrackLyricsCacheKey(track);
  clientLyricsCache.set(key, items);

  if (typeof window !== 'undefined' && items) {
    try {
      localStorage.setItem(
        `${WBW_LYRICS_STORAGE_PREFIX}${key}`,
        JSON.stringify({ ts: Date.now(), items })
      );
    } catch {
      // If localStorage quota is reached, clean older entries
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(WBW_LYRICS_STORAGE_PREFIX)) {
            toRemove.push(k);
          }
        }
        toRemove.slice(0, 30).forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  }
}

export function parseSyllablesFromRaw(rawSyllables: any[]): LyricSyllable[] {
  if (!Array.isArray(rawSyllables)) return [];
  return rawSyllables.map((s: any, idx: number) => {
    let txt = s.Text || '';
    const isLastInWord = !s.IsPartOfWord;
    const nextSyl = rawSyllables[idx + 1];
    if (isLastInWord && nextSyl && !txt.endsWith(' ') && !(nextSyl.Text || '').startsWith(' ')) {
      txt += ' ';
    }
    return {
      text: txt,
      isPartOfWord: !!s.IsPartOfWord,
      startTime: s.StartTime ?? 0,
      endTime: s.EndTime ?? s.StartTime ?? 0,
    };
  });
}

export function buildAppleLyricsFromSpicy(content: any[]): LyricDisplayItem[] {
  if (!Array.isArray(content) || !content.length) return [];
  const items: LyricDisplayItem[] = [];

  const firstVocal = content.find(
    (c) => c?.Type === 'Vocal' && ((c?.Lead?.Syllables && c.Lead.Syllables.length > 0) || (c?.Background && c.Background.length > 0))
  );
  const firstStartTime = firstVocal?.StartTime ?? firstVocal?.Lead?.StartTime ?? 0;

  if (firstStartTime >= 2.5) {
    items.push({
      id: 'interlude-intro',
      time: 0,
      endTime: firstStartTime,
      text: '',
      isInterlude: true,
    });
  }

  for (let i = 0; i < content.length; i++) {
    const item = content[i];
    if (item?.Type !== 'Vocal') continue;

    const rawLeadSyllables = item.Lead?.Syllables || [];
    const leadSyllables: LyricSyllable[] = parseSyllablesFromRaw(rawLeadSyllables);
    const lineText = leadSyllables.map((s) => s.text).join('').trim();

    // Parse background vocals if present
    const backgroundItems: LyricBackgroundItem[] = [];
    if (Array.isArray(item.Background) && item.Background.length > 0) {
      item.Background.forEach((bg: any, bgIdx: number) => {
        const bgRawSyllables = bg.Syllables || [];
        const bgSyllables: LyricSyllable[] = parseSyllablesFromRaw(bgRawSyllables);
        const bgText = bgSyllables.map((s) => s.text).join('').trim();
        if (bgText) {
          const bgStartTime = bg.StartTime ?? bgSyllables[0]?.startTime ?? 0;
          const bgEndTime = bg.EndTime ?? bgSyllables[bgSyllables.length - 1]?.endTime ?? bgStartTime;
          backgroundItems.push({
            id: `spicy-bg-${i}-${bgIdx}-${bgStartTime}`,
            time: bgStartTime,
            endTime: bgEndTime,
            text: bgText,
            syllables: bgSyllables,
          });
        }
      });
    }

    if (!lineText && backgroundItems.length === 0) continue;

    const startTime = item.StartTime ?? item.Lead?.StartTime ?? leadSyllables[0]?.startTime ?? backgroundItems[0]?.time ?? 0;
    const endTime = item.EndTime ?? item.Lead?.EndTime ?? leadSyllables[leadSyllables.length - 1]?.endTime ?? backgroundItems[backgroundItems.length - 1]?.endTime ?? startTime;

    // Check if there is an interlude before this line
    const prevItem = items[items.length - 1];
    if (prevItem && !prevItem.isInterlude && prevItem.endTime !== undefined) {
      if (startTime - prevItem.endTime >= 4.5) {
        items.push({
          id: `interlude-${i}-${prevItem.endTime}`,
          time: prevItem.endTime,
          endTime: startTime,
          text: '',
          isInterlude: true,
        });
      }
    }

    items.push({
      id: `spicy-lyric-${i}-${startTime}`,
      time: startTime,
      endTime: endTime,
      text: lineText,
      isInterlude: false,
      oppositeAligned: !!item.OppositeAligned,
      syllables: leadSyllables.length > 0 ? leadSyllables : undefined,
      background: backgroundItems.length > 0 ? backgroundItems : undefined,
    });
  }

  return items;
}

// In-flight request tracker to prevent redundant duplicate network fetches
const inFlightPrefetches = new Set<string>();

export async function prefetchLyrics(track: any): Promise<void> {
  if (!track || !track.name) return;
  const key = getTrackLyricsCacheKey(track);

  // 1. Check if already cached (memory or localStorage)
  const cached = getCachedWbwLyrics(track);
  if (cached !== undefined) return;

  // 2. Prevent duplicate concurrent requests
  if (inFlightPrefetches.has(key)) return;
  inFlightPrefetches.add(key);

  try {
    const params = new URLSearchParams();
    if (track.name) params.set('title', track.name);
    if (track.artist) params.set('artist', track.artist);
    if (track.album) params.set('album', track.album);
    if (track.duration) params.set('duration', String(track.duration));

    const res = await fetch(`/api/lyrics?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.Body?.Type === 'Syllable' && Array.isArray(data?.Body?.Content)) {
        const spicyItems = buildAppleLyricsFromSpicy(data.Body.Content);
        if (spicyItems.length > 0) {
          setCachedWbwLyrics(track, spicyItems);
          return;
        }
      }
    } else if (res.status === 404) {
      setCachedWbwLyrics(track, null);
    }
  } catch (err) {
    // Non-critical background fetch failure
  } finally {
    inFlightPrefetches.delete(key);
  }
}

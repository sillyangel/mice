// Browser codec support probing + server-side transcode format selection.
// Navidrome's /rest/stream accepts `format=mp3|opus|aac|flac|raw` and transcodes
// on the fly with ffmpeg, so we only request a transcode when the browser can't
// play the original file (e.g. ALAC/AAC on Chrome/Firefox, WMA/APE anywhere).

type Support = Record<string, boolean>;

let cachedSupport: Support | null = null;

function probe(mimeType: string): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.createElement('audio');
  return el.canPlayType(mimeType) !== '';
}

function detectSupport(): Support {
  if (cachedSupport) return cachedSupport;
  cachedSupport = {
    mp3: probe('audio/mpeg'),
    aac: probe('audio/mp4; codecs="mp4a.40.2"'),
    alac: probe('audio/mp4; codecs="alac"') || probe('audio/x-m4a; codecs="alac"'),
    mp4: probe('audio/mp4'),
    flac: probe('audio/flac') || probe('audio/x-flac') || probe('audio/flac; codecs="flac"'),
    oggVorbis: probe('audio/ogg; codecs="vorbis"'),
    oggOpus: probe('audio/ogg; codecs="opus"') || probe('audio/opus'),
    webmOpus: probe('audio/webm; codecs="opus"'),
    wav: probe('audio/wav') || probe('audio/wav; codecs="1"'),
  };
  return cachedSupport;
}

// Suffixes we always hand to the server for transcoding.
const ALWAYS_TRANSCODE = new Set([
  'aiff', 'aif', 'aifc', 'wma', 'wmv', 'ape', 'dsf', 'dff', 'tak', 'tta',
  'ra', 'rm', 'mka', 'amr', 'au', 'mp2', 'ac3', 'dts', 'w64',
]);

// `.m4a`/`.mp4`/`.aac` containers may hold AAC (plays on Chrome/Safari) or ALAC
// (plays on Safari only). We pass them through when the container is playable
// and rely on the reactive fallback in AudioPlayer for misclassified files.
const MP4_FAMILY = new Set(['m4a', 'mp4', 'm4b', 'm4p', 'aac', 'alac', 'caf', 'm4r']);

const ALWAYS_PASSTHROUGH = new Set(['mp3', 'flac', 'ogg', 'oga', 'wav', 'wave', 'webm']);

export function isSuffixPlayable(suffix?: string): boolean {
  const s = suffix?.toLowerCase();
  if (!s) return true;
  if (ALWAYS_TRANSCODE.has(s)) return false;
  if (ALWAYS_PASSTHROUGH.has(s)) return true;

  const sup = detectSupport();
  if (MP4_FAMILY.has(s)) return sup.alac || sup.mp4 || sup.aac;
  return true;
}

// Returns a Navidrome `format` token when the original file needs transcoding,
// or undefined to stream the original bytes untouched.
export function selectStreamFormat(suffix?: string): string | undefined {
  if (isSuffixPlayable(suffix)) return undefined;
  // mp3 is universally decodable and always a default Navidrome transcode target.
  return 'mp3';
}
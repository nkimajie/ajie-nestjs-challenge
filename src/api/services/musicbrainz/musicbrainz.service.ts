import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

const MUSICBRAINZ_USER_AGENT =
  'BrokenRecordStoreAPI/1.0 (https://github.com/nestjs-challenge)';

/** Parses MusicBrainz release XML and returns ordered track titles. Exported for unit tests. */
export function parseTracklistFromReleaseXml(xml: string): string[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    trimValues: true,
  });
  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch {
    return [];
  }
  return extractTitlesFromParsedMetadata(parsed);
}

function extractTitlesFromParsedMetadata(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== 'object') return [];
  const root = parsed as Record<string, unknown>;
  const metadata = (root.metadata ?? root) as Record<string, unknown>;
  const release = metadata.release as Record<string, unknown> | undefined;
  if (!release) return [];

  const mediumList = release['medium-list'] as Record<string, unknown> | undefined;
  const mediumsRaw = mediumList?.medium;
  const mediums = normalizeArray(mediumsRaw);

  const titles: string[] = [];
  for (const medium of mediums) {
    if (!medium || typeof medium !== 'object') continue;
    const m = medium as Record<string, unknown>;
    const trackList = m['track-list'] as Record<string, unknown> | undefined;
    const tracksRaw = trackList?.track;
    const tracks = normalizeArray(tracksRaw);
    for (const track of tracks) {
      const title = extractTrackTitle(track);
      if (title) titles.push(title);
    }
  }
  return titles;
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function extractTrackTitle(track: unknown): string | null {
  if (track === null || track === undefined) return null;
  if (typeof track === 'string') return track.trim() || null;
  if (typeof track !== 'object') return null;
  const t = track as Record<string, unknown>;
  const direct = pickTitleString(t.title);
  if (direct) return direct;
  const recording = t.recording as Record<string, unknown> | undefined;
  if (recording) {
    const fromRec = pickTitleString(recording.title);
    if (fromRec) return fromRec;
  }
  return null;
}

function pickTitleString(
  title: unknown,
): string | null {
  if (title === null || title === undefined) return null;
  if (typeof title === 'string') return title.trim() || null;
  if (typeof title === 'object' && title !== null && '#text' in title) {
    const v = (title as { '#text': unknown })['#text'];
    return typeof v === 'string' ? v.trim() || null : null;
  }
  return null;
}

@Injectable()
export class MusicBrainzService {
  private readonly logger = new Logger(MusicBrainzService.name);

  /**
   * Fetches release XML from MusicBrainz and returns track titles.
   * Returns an empty array if the MBID is unknown or the response is not a valid release.
   */
  async getTracklistForRelease(mbid: string): Promise<string[]> {
    const id = mbid?.trim();
    if (!id) return [];

    const url = `https://musicbrainz.org/ws/2/release/${encodeURIComponent(id)}?inc=recordings+media&fmt=xml`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
      });
      if (!res.ok) {
        this.logger.debug(`MusicBrainz HTTP ${res.status} for ${id}`);
        return [];
      }
      const xml = await res.text();
      if (xml.includes('<error')) {
        return [];
      }
      return parseTracklistFromReleaseXml(xml);
    } catch (err) {
      this.logger.warn(`MusicBrainz fetch failed for ${id}: ${String(err)}`);
      return [];
    }
  }
}

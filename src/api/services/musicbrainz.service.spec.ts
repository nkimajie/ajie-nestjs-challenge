import {
  MusicBrainzService,
  parseTracklistFromReleaseXml,
} from './musicbrainz.service';

describe('parseTracklistFromReleaseXml', () => {
  it('extracts titles from typical MusicBrainz-style XML', () => {
    const xml = `<?xml version="1.0"?>
<metadata xmlns="http://musicbrainz.org/ns/mmd-2.0#">
  <release id="x">
    <medium-list>
      <medium>
        <track-list>
          <track><title>Come Together</title></track>
          <track><title>Something</title></track>
        </track-list>
      </medium>
    </medium-list>
  </release>
</metadata>`;
    expect(parseTracklistFromReleaseXml(xml)).toEqual([
      'Come Together',
      'Something',
    ]);
  });

  it('handles a single track object (not array)', () => {
    const xml = `<?xml version="1.0"?>
<metadata>
  <release>
    <medium-list>
      <medium>
        <track-list>
          <track><title>Only One</title></track>
        </track-list>
      </medium>
    </medium-list>
  </release>
</metadata>`;
    expect(parseTracklistFromReleaseXml(xml)).toEqual(['Only One']);
  });

  it('returns empty array for invalid XML', () => {
    expect(parseTracklistFromReleaseXml('not xml')).toEqual([]);
  });
});

describe('MusicBrainzService', () => {
  it('should be defined', () => {
    expect(new MusicBrainzService()).toBeDefined();
  });
});

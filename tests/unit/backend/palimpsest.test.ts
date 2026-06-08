import { describe, expect, it } from 'vitest';
import {
  buildCdxUrl,
  buildTimeline,
  historical200Paths,
  parseCdx,
  pathOf,
  pickAcrossSpan,
} from '../../../backend/src/services/palimpsest.js';

const SAMPLE = [
  ['timestamp', 'original', 'statuscode', 'mimetype'],
  ['20190301120000', 'http://example.com/', '200', 'text/html'],
  ['20190615120000', 'http://example.com/old-admin', '200', 'text/html'],
  ['20210101120000', 'http://example.com/', '200', 'text/html'],
  ['20210202120000', 'http://example.com/blog?id=1', '301', 'text/html'],
  ['20230505120000', 'http://example.com/', '200', 'text/html'],
];

describe('buildCdxUrl', () => {
  it('targets the whole domain with a JSON, collapsed query', () => {
    const url = buildCdxUrl('example.com', 500);
    expect(url).toContain('web.archive.org/cdx');
    expect(url).toContain('url=example.com');
    expect(url).toContain('matchType=host');
    expect(url).toContain('output=json');
    expect(url).toContain('limit=500');
  });
});

describe('parseCdx', () => {
  it('drops the header row and malformed rows', () => {
    const rows = parseCdx(SAMPLE);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ status: '200', original: 'http://example.com/' });
  });

  it('returns empty array for non-array / empty input', () => {
    expect(parseCdx(null)).toEqual([]);
    expect(parseCdx([])).toEqual([]);
    expect(parseCdx([['header']])).toEqual([]);
  });
});

describe('pathOf', () => {
  it('extracts path and query, defaults to /', () => {
    expect(pathOf('http://example.com/')).toBe('/');
    expect(pathOf('http://example.com/blog?id=1')).toBe('/blog?id=1');
  });
});

describe('buildTimeline', () => {
  it('buckets snapshots per year, oldest first', () => {
    const timeline = buildTimeline(parseCdx(SAMPLE));
    expect(timeline.map((t) => t.period)).toEqual(['2019', '2021', '2023']);

    const y2019 = timeline[0];
    expect(y2019.totalSnapshots).toBe(2);
    expect(y2019.uniquePaths).toBe(2);
    expect(y2019.statuses['200']).toBe(2);

    const y2021 = timeline[1];
    expect(y2021.statuses['200']).toBe(1);
    expect(y2021.statuses['301']).toBe(1);
  });
});

describe('historical200Paths', () => {
  it('maps each 200 path to its most recent year', () => {
    const map = historical200Paths(parseCdx(SAMPLE));
    expect(map.get('/')).toBe('2023');
    expect(map.get('/old-admin')).toBe('2019');
    expect(map.has('/blog?id=1')).toBe(false);
  });
});

describe('pickAcrossSpan', () => {
  it('returns all items when fewer than count', () => {
    expect(pickAcrossSpan([1, 2, 3], 8)).toEqual([1, 2, 3]);
  });

  it('samples endpoints and a spread in between', () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const picked = pickAcrossSpan(items, 5);
    expect(picked[0]).toBe(0);
    expect(picked[picked.length - 1]).toBe(99);
    expect(picked.length).toBeLessThanOrEqual(5);
    expect(new Set(picked).size).toBe(picked.length);
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildFlightPathGroups,
  copyFlightPath,
  flightPathKey,
  flightPathLetter,
  letterFor,
  letterIndex,
  newFlightPath,
  nextFlightPathLabel,
  validateFlightPaths,
} from '../flight-path-groups';
import type { FlightPath, FlightPathSurface, Observation } from '../observation';

let tick = 0;

function obs(id: string, overrides: Partial<Observation> = {}): Observation {
  tick += 1;
  return {
    id,
    surveyId: 's1',
    locationId: 'loc1',
    surveyorId: 'sv1',
    species: null,
    firstSeenAt: null,
    lastSeenAt: null,
    seenCount: 0,
    heardCount: 0,
    frequency: null,
    direction: null,
    notes: null,
    emergence: false,
    flightPaths: [],
    data: {},
    createdAt: new Date(2026, 0, 1, 0, 0, tick),
    updatedAt: new Date(2026, 0, 1, 0, 0, tick),
    ...overrides,
  };
}

/** A stroke as drawn before paths carried a key or letter. */
function legacy(id: string, surface: FlightPathSurface): FlightPath {
  return { id, surface, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
}

function keyed(id: string, surface: FlightPathSurface, pathKey: string, label: string): FlightPath {
  return { ...legacy(id, surface), pathKey, label };
}

describe('letterFor / letterIndex', () => {
  it('runs A..Z then AA, AB, and round-trips', () => {
    expect([0, 25, 26, 27, 52].map(letterFor)).toEqual(['A', 'Z', 'AA', 'AB', 'BA']);
    for (const n of [0, 25, 26, 27, 52, 701]) expect(letterIndex(letterFor(n))).toBe(n);
  });

  it('rejects anything that is not a letter label', () => {
    expect(letterIndex('')).toBe(-1);
    expect(letterIndex('a')).toBe(-1);
    expect(letterIndex('1A')).toBe(-1);
  });
});

describe('buildFlightPathGroups', () => {
  it('letters older surveys exactly as before: one path per observation, in draw order', () => {
    const a = obs('a', { flightPaths: [legacy('p1', 'boundary'), legacy('p2', 'frontView')] });
    const b = obs('b', { flightPaths: [legacy('p3', 'boundary')] });
    const other = obs('c', { surveyorId: 'sv2', flightPaths: [legacy('p4', 'boundary')] });
    const all = [other, b, a];

    expect(buildFlightPathGroups(all, 'sv1', 'boundary').map((g) => [g.letter, g.sourceObservationId]))
      .toEqual([['A', 'a'], ['B', 'b']]);
    expect(buildFlightPathGroups(all, 'sv1', 'frontView').map((g) => [g.letter, g.sourceObservationId]))
      .toEqual([['A', 'a']]);
    expect(buildFlightPathGroups(all, 'sv2', 'boundary').map((g) => [g.letter, g.sourceObservationId]))
      .toEqual([['A', 'c']]);
  });

  it('groups copies of a path by key, earliest holder first', () => {
    const a = obs('a', { flightPaths: [keyed('p1', 'boundary', 'k1', 'A')] });
    const b = obs('b', { flightPaths: [keyed('p1', 'boundary', 'k1', 'A')] });
    const c = obs('c', { flightPaths: [keyed('p1', 'frontView', 'k9', 'A')] });

    const [group, ...rest] = buildFlightPathGroups([c, b, a], 'sv1', 'boundary');
    expect(rest).toEqual([]);
    expect(group).toMatchObject({ key: 'k1', letter: 'A', sourceObservationId: 'a', memberObservationIds: ['a', 'b'] });
    expect(group.paths).toEqual([keyed('p1', 'boundary', 'k1', 'A')]);
  });

  it('keeps stored letters when earlier paths disappear', () => {
    const b = obs('b', { flightPaths: [keyed('p2', 'boundary', 'k2', 'B')] });
    const c = obs('c', { flightPaths: [keyed('p3', 'boundary', 'k3', 'C')] });
    expect(buildFlightPathGroups([b, c], 'sv1', 'boundary').map((g) => g.letter)).toEqual(['B', 'C']);
  });

  it('gives older unlabelled paths the letters stored paths have not taken', () => {
    const old = obs('old', { flightPaths: [legacy('p1', 'boundary')] });
    const reused = obs('reused', { flightPaths: [keyed('p2', 'boundary', 'k2', 'A')] });
    expect(buildFlightPathGroups([old, reused], 'sv1', 'boundary').map((g) => [g.letter, g.key]))
      .toEqual([['B', 'legacy:old:boundary'], ['A', 'k2']]);
  });

  it('pins an older path\'s letter once a copy of it has been stored', () => {
    const a = obs('a', { flightPaths: [legacy('p1', 'boundary')] });
    const b = obs('b', { flightPaths: [legacy('p2', 'boundary')] });
    const [, groupB] = buildFlightPathGroups([a, b], 'sv1', 'boundary');
    const copy = obs('copy', { flightPaths: copyFlightPath(groupB) });

    // Deleting `a` would have shifted b to A; the stored copy keeps it B.
    expect(buildFlightPathGroups([b, copy], 'sv1', 'boundary').map((g) => [g.letter, g.memberObservationIds]))
      .toEqual([['B', ['b', 'copy']]]);
  });

  it('letters by when each path was drawn, so a redrawn path follows older ones', () => {
    const a = obs('a');
    const b = obs('b', { flightPaths: [legacy('p1', 'boundary')] });
    const redrawn = { ...a, flightPaths: [{ ...legacy('p9', 'boundary'), createdAt: b.createdAt.getTime() + 1000 }] };

    expect(buildFlightPathGroups([redrawn, b], 'sv1', 'boundary').map((g) => [g.letter, g.sourceObservationId]))
      .toEqual([['A', 'b'], ['B', 'a']]);
  });
});

describe('flightPathKey / flightPathLetter', () => {
  it('identifies the path an observation holds on a surface', () => {
    const a = obs('a', { flightPaths: [legacy('p1', 'boundary')] });
    const b = obs('b', { flightPaths: [keyed('p2', 'boundary', 'k2', 'B'), legacy('p3', 'frontView')] });
    const c = obs('c', { flightPaths: [keyed('p2', 'boundary', 'k2', 'B')] });
    const all = [a, b, c];

    expect(flightPathKey(a, 'boundary')).toBe('legacy:a:boundary');
    expect(flightPathKey(c, 'boundary')).toBe('k2');
    expect(flightPathKey(c, 'frontView')).toBeUndefined();
    expect(flightPathLetter(c, all, 'boundary')).toBe('B');
    expect(flightPathLetter(b, all, 'frontView')).toBe('A');
    expect(flightPathLetter(c, all, 'frontView')).toBeUndefined();
  });
});

describe('nextFlightPathLabel / newFlightPath', () => {
  it('takes the letter after the surveyor\'s highest on that surface', () => {
    const a = obs('a', { flightPaths: [legacy('p1', 'boundary')] });
    const c = obs('c', { flightPaths: [keyed('p3', 'boundary', 'k3', 'C')] });
    expect(nextFlightPathLabel([], 'sv1', 'boundary')).toBe('A');
    expect(nextFlightPathLabel([a, c], 'sv1', 'boundary')).toBe('D');
    expect(nextFlightPathLabel([a, c], 'sv1', 'frontView')).toBe('A');
    expect(nextFlightPathLabel([a, c], 'sv2', 'boundary')).toBe('A');
  });

  it('stamps freshly drawn strokes with a shared key and the next letter', () => {
    const a = obs('a', { flightPaths: [legacy('p1', 'boundary')] });
    const strokes = [legacy('s1', 'boundary'), legacy('s2', 'boundary')];
    expect(newFlightPath(strokes, [a], 'sv1', 'boundary')).toEqual([
      keyed('s1', 'boundary', 's1', 'B'),
      keyed('s2', 'boundary', 's1', 'B'),
    ]);
    expect(newFlightPath([], [a], 'sv1', 'boundary')).toEqual([]);
  });
});

describe('copyFlightPath', () => {
  it('copies an older path under its derived key and letter', () => {
    const a = obs('a', { flightPaths: [legacy('p1', 'boundary')] });
    const [group] = buildFlightPathGroups([a], 'sv1', 'boundary');
    expect(copyFlightPath(group)).toEqual([keyed('p1', 'boundary', 'legacy:a:boundary', 'A')]);
  });
});

describe('validateFlightPaths', () => {
  it('accepts one path per surface, old or new', () => {
    expect(validateFlightPaths(obs('o'))).toBeNull();
    expect(validateFlightPaths(obs('o', { flightPaths: [legacy('p1', 'boundary'), legacy('p2', 'boundary')] }))).toBeNull();
    expect(validateFlightPaths(obs('o', {
      flightPaths: [keyed('p1', 'boundary', 'k1', 'A'), keyed('p2', 'boundary', 'k1', 'A'), keyed('p3', 'frontView', 'k2', 'A')],
    }))).toBeNull();
  });

  it.each([
    ['two keys on one surface', [keyed('p1', 'boundary', 'k1', 'A'), keyed('p2', 'boundary', 'k2', 'A')]],
    ['two letters on one surface', [keyed('p1', 'boundary', 'k1', 'A'), keyed('p2', 'boundary', 'k1', 'B')]],
    ['old and new strokes mixed', [legacy('p1', 'boundary'), keyed('p2', 'boundary', 'k1', 'A')]],
  ])('rejects %s', (_, flightPaths) => {
    expect(validateFlightPaths(obs('o', { flightPaths }))).toContain('Only one flight path');
  });
});

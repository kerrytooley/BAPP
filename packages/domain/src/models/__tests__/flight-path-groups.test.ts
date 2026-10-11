import { describe, it, expect } from 'vitest';
import {
  buildFlightPathGroups,
  flightPathLetter,
  letterFor,
  planFlightPathTransfer,
  resolveFlightPaths,
  validateFlightPathLinks,
} from '../flight-path-groups';
import type { FlightPath, FlightPathLink, FlightPathSurface, Observation } from '../observation';

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
    flightPathLinks: [],
    data: {},
    createdAt: new Date(2026, 0, 1, 0, 0, tick),
    updatedAt: new Date(2026, 0, 1, 0, 0, tick),
    ...overrides,
  };
}

function path(id: string, surface: FlightPathSurface): FlightPath {
  return { id, surface, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
}

function link(observationId: string, surface: FlightPathSurface): FlightPathLink {
  return { observationId, surface };
}

describe('letterFor', () => {
  it('runs A..Z then AA, AB', () => {
    expect(letterFor(0)).toBe('A');
    expect(letterFor(25)).toBe('Z');
    expect(letterFor(26)).toBe('AA');
    expect(letterFor(27)).toBe('AB');
    expect(letterFor(52)).toBe('BA');
  });
});

describe('buildFlightPathGroups', () => {
  it('letters each surveyor separately per surface, in creation order', () => {
    const a = obs('a', { flightPaths: [path('p1', 'boundary'), path('p2', 'frontView')] });
    const b = obs('b', { flightPaths: [path('p3', 'boundary')] });
    const other = obs('c', { surveyorId: 'sv2', flightPaths: [path('p4', 'boundary')] });
    const all = [other, b, a];

    expect(buildFlightPathGroups(all, 'sv1', 'boundary').map((g) => [g.letter, g.sourceObservationId]))
      .toEqual([['A', 'a'], ['B', 'b']]);
    expect(buildFlightPathGroups(all, 'sv1', 'frontView').map((g) => [g.letter, g.sourceObservationId]))
      .toEqual([['A', 'a']]);
    expect(buildFlightPathGroups(all, 'sv2', 'boundary').map((g) => [g.letter, g.sourceObservationId]))
      .toEqual([['A', 'c']]);
  });

  it('lists the source then linked observations as members', () => {
    const a = obs('a', { flightPaths: [path('p1', 'boundary')] });
    const b = obs('b', { flightPathLinks: [link('a', 'boundary')] });
    const c = obs('c', { flightPathLinks: [link('a', 'frontView')] });

    const [group] = buildFlightPathGroups([c, b, a], 'sv1', 'boundary');
    expect(group.memberObservationIds).toEqual(['a', 'b']);
    expect(group.paths).toEqual([path('p1', 'boundary')]);
  });

  it('does not letter observations that only link', () => {
    const a = obs('a', { flightPaths: [path('p1', 'boundary')] });
    const b = obs('b', { flightPathLinks: [link('a', 'boundary')] });
    expect(buildFlightPathGroups([a, b], 'sv1', 'boundary')).toHaveLength(1);
  });

  it('letters by when each path was drawn, so a redrawn path follows older ones', () => {
    const a = obs('a');
    const b = obs('b');
    const redrawn = { ...a, flightPaths: [{ ...path('p9', 'boundary'), createdAt: b.createdAt.getTime() + 1000 }] };
    const inherited = { ...b, flightPaths: [path('p1', 'boundary')] };

    expect(buildFlightPathGroups([redrawn, inherited], 'sv1', 'boundary').map((g) => [g.letter, g.sourceObservationId]))
      .toEqual([['A', 'b'], ['B', 'a']]);
  });
});

describe('flightPathLetter', () => {
  it('returns the letter an observation drew or links to on a surface', () => {
    const a = obs('a', { flightPaths: [path('p1', 'boundary')] });
    const b = obs('b', { flightPaths: [path('p2', 'boundary'), path('p3', 'frontView')] });
    const c = obs('c', { flightPathLinks: [link('b', 'boundary')] });
    const all = [a, b, c];

    expect(flightPathLetter(c, all, 'boundary')).toBe('B');
    expect(flightPathLetter(b, all, 'frontView')).toBe('A');
    expect(flightPathLetter(c, all, 'frontView')).toBeUndefined();
  });
});

describe('resolveFlightPaths', () => {
  const a = obs('a', { flightPaths: [path('p1', 'boundary')] });
  const b = obs('b', { flightPathLinks: [link('a', 'boundary')] });
  const dangling = obs('d', { flightPathLinks: [link('missing', 'boundary')] });

  it('returns own strokes', () => {
    expect(resolveFlightPaths(a, [a, b], 'boundary')).toEqual([path('p1', 'boundary')]);
  });

  it('follows a link', () => {
    expect(resolveFlightPaths(b, [a, b], 'boundary')).toEqual([path('p1', 'boundary')]);
  });

  it('returns nothing without paths or for a dangling link', () => {
    expect(resolveFlightPaths(b, [a, b], 'frontView')).toEqual([]);
    expect(resolveFlightPaths(dangling, [a, dangling], 'boundary')).toEqual([]);
  });
});

describe('validateFlightPathLinks', () => {
  const source = obs('src', { flightPaths: [path('p1', 'boundary'), path('p2', 'frontView')] });

  it('accepts a valid link', () => {
    const o = obs('o', { flightPathLinks: [link('src', 'boundary'), link('src', 'frontView')] });
    expect(validateFlightPathLinks(o, [source, o])).toBeNull();
  });

  it.each([
    ['two links on one surface', obs('o', { flightPathLinks: [link('src', 'boundary'), link('src', 'boundary')] }), 'Only one'],
    ['linking to itself', obs('o', { flightPathLinks: [link('o', 'boundary')] }), 'its own'],
    ['drawing and linking', obs('o', { flightPaths: [path('x', 'boundary')], flightPathLinks: [link('src', 'boundary')] }), 'both draw'],
    ['a missing target', obs('o', { flightPathLinks: [link('nope', 'boundary')] }), 'not found'],
    ['another surveyor', obs('o', { surveyorId: 'sv2', flightPathLinks: [link('src', 'boundary')] }), 'your own'],
    ['another survey', obs('o', { surveyId: 's2', flightPathLinks: [link('src', 'boundary')] }), 'your own'],
    ['another location front view', obs('o', { locationId: 'loc2', flightPathLinks: [link('src', 'frontView')] }), 'same location'],
  ])('rejects %s', (_, o, message) => {
    expect(validateFlightPathLinks(o, [source, o])).toContain(message);
  });

  it('rejects a chain (target only links)', () => {
    const middle = obs('m', { flightPathLinks: [link('src', 'boundary')] });
    const o = obs('o', { flightPathLinks: [link('m', 'boundary')] });
    expect(validateFlightPathLinks(o, [source, middle, o])).toContain('no flight path');
  });

  it('allows overhead links across locations', () => {
    const o = obs('o', { locationId: 'loc2', flightPathLinks: [link('src', 'boundary')] });
    expect(validateFlightPathLinks(o, [source, o])).toBeNull();
  });
});

describe('planFlightPathTransfer', () => {
  it('hands strokes to the earliest dependent and re-points the rest', () => {
    const src = obs('src', { flightPaths: [path('p1', 'boundary')] });
    const first = obs('first', { flightPathLinks: [link('src', 'boundary')] });
    const second = obs('second', { flightPathLinks: [link('src', 'boundary')] });

    const transfers = planFlightPathTransfer(src, null, [second, src, first]);

    expect(transfers).toEqual([
      { observationId: 'first', input: { flightPaths: [path('p1', 'boundary')], flightPathLinks: [] } },
      { observationId: 'second', input: { flightPaths: [], flightPathLinks: [link('first', 'boundary')] } },
    ]);
  });

  it('transfers per surface independently', () => {
    const src = obs('src', { flightPaths: [path('p1', 'boundary'), path('p2', 'frontView')] });
    const dep = obs('dep', { flightPathLinks: [link('src', 'boundary'), link('src', 'frontView')] });

    const [transfer] = planFlightPathTransfer(src, null, [src, dep]);
    expect(transfer.input.flightPaths).toEqual([path('p1', 'boundary'), path('p2', 'frontView')]);
    expect(transfer.input.flightPathLinks).toEqual([]);
  });

  it('does nothing when the source keeps the same strokes', () => {
    const src = obs('src', { flightPaths: [path('p1', 'boundary')] });
    const unchanged = { ...src, seenCount: 3 };
    const dep = obs('dep', { flightPathLinks: [link('src', 'boundary')] });
    expect(planFlightPathTransfer(src, unchanged, [unchanged, dep])).toEqual([]);
  });

  it('keeps the old strokes for dependents when the source redraws', () => {
    const src = obs('src', { flightPaths: [path('p1', 'boundary')] });
    const redrawn = { ...src, flightPaths: [path('p9', 'boundary')] };
    const dep = obs('dep', { flightPathLinks: [link('src', 'boundary')] });
    expect(planFlightPathTransfer(src, redrawn, [redrawn, dep])).toEqual([
      { observationId: 'dep', input: { flightPaths: [path('p1', 'boundary')], flightPathLinks: [] } },
    ]);
  });

  it('transfers when an update drops the strokes', () => {
    const src = obs('src', { flightPaths: [path('p1', 'boundary')] });
    const cleared = { ...src, flightPaths: [] };
    const dep = obs('dep', { flightPathLinks: [link('src', 'boundary')] });
    expect(planFlightPathTransfer(src, cleared, [cleared, dep])).toHaveLength(1);
  });

  it('does nothing without dependents', () => {
    const src = obs('src', { flightPaths: [path('p1', 'boundary')] });
    expect(planFlightPathTransfer(src, null, [src])).toEqual([]);
  });
});

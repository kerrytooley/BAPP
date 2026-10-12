import type { FlightPath, FlightPathSurface, Observation } from './observation';

const SURFACES: FlightPathSurface[] = ['boundary', 'frontView'];

/** One lettered flight path and every observation that recorded it. */
export interface FlightPathGroup {
    /** The path's `pathKey`, or a per-observation key for strokes drawn before reuse existed. */
    key: string;
    letter: string;
    surveyorId: string;
    surface: FlightPathSurface;
    /** The earliest observation holding the path; its strokes are the group's `paths`. */
    sourceObservationId: string;
    paths: FlightPath[];
    /** Every observation holding a copy of the path, earliest first. */
    memberObservationIds: string[];
}

/** 0 → A, 25 → Z, 26 → AA, … */
export function letterFor(index: number): string {
    let n = index;
    let letters = '';
    do {
        letters = String.fromCharCode(65 + (n % 26)) + letters;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return letters;
}

/** Inverse of `letterFor`: A → 0, AA → 26; -1 for anything that isn't a letter label. */
export function letterIndex(letter: string): number {
    if (!/^[A-Z]+$/.test(letter)) return -1;
    let n = 0;
    for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
}

export function flightPathsOn(observation: Observation, surface: FlightPathSurface): FlightPath[] {
    return observation.flightPaths.filter((path) => path.surface === surface);
}

/** Identity of the path `observation` holds on `surface`, if it has one. */
export function flightPathKey(observation: Observation, surface: FlightPathSurface): string | undefined {
    const [first] = flightPathsOn(observation, surface);
    if (!first) return undefined;
    return first.pathKey ?? `legacy:${observation.id}:${surface}`;
}

/**
 * A surveyor's lettered paths on `surface`, in the order they were first drawn.
 * Observations holding the same `pathKey` share one group. Paths keep the letter
 * stored with them; older, unlabelled paths take the remaining letters in draw
 * order (which, for a survey recorded before letters were stored, is exactly how
 * they were always lettered).
 */
export function buildFlightPathGroups(
    observations: Observation[],
    surveyorId: string,
    surface: FlightPathSurface,
): FlightPathGroup[] {
    const holdersByKey = new Map<string, Observation[]>();
    for (const observation of observations.filter((o) => o.surveyorId === surveyorId).sort(compareByCreation)) {
        const key = flightPathKey(observation, surface);
        if (key) holdersByKey.set(key, [...(holdersByKey.get(key) ?? []), observation]);
    }

    const drafts = [...holdersByKey].map(([key, holders]) => {
        const source = holders[0];
        const paths = flightPathsOn(source, surface);
        return {
            key,
            source,
            holders,
            paths,
            label: holders.flatMap((o) => flightPathsOn(o, surface)).find((p) => p.label)?.label,
            drawnAt: Math.min(...paths.map((p) => p.createdAt ?? source.createdAt.getTime())),
        };
    }).sort((a, b) => a.drawnAt - b.drawnAt || compareByCreation(a.source, b.source));

    const used = new Set(drafts.flatMap((d) => (d.label ? [d.label] : [])));
    let next = 0;
    const nextFreeLetter = () => {
        while (used.has(letterFor(next))) next += 1;
        used.add(letterFor(next));
        return letterFor(next);
    };

    return drafts.map((draft) => ({
        key: draft.key,
        letter: draft.label ?? nextFreeLetter(),
        surveyorId,
        surface,
        sourceObservationId: draft.source.id,
        paths: draft.paths,
        memberObservationIds: draft.holders.map((o) => o.id),
    }));
}

/** The letter of the path `observation` holds on `surface`, if any. */
export function flightPathLetter(
    observation: Observation,
    observations: Observation[],
    surface: FlightPathSurface,
): string | undefined {
    const key = flightPathKey(observation, surface);
    if (!key) return undefined;
    return buildFlightPathGroups(observations, observation.surveyorId, surface)
        .find((group) => group.key === key)?.letter;
}

/** The letter a newly drawn path gets: one past the surveyor's highest letter on `surface`. */
export function nextFlightPathLabel(
    observations: Observation[],
    surveyorId: string,
    surface: FlightPathSurface,
): string {
    const letters = buildFlightPathGroups(observations, surveyorId, surface).map((g) => letterIndex(g.letter));
    return letterFor(Math.max(-1, ...letters) + 1);
}

/** Freshly drawn strokes, stamped as a new path with its own key and the next letter. */
export function newFlightPath(
    strokes: FlightPath[],
    observations: Observation[],
    surveyorId: string,
    surface: FlightPathSurface,
): FlightPath[] {
    if (strokes.length === 0) return [];
    const pathKey = strokes[0].id;
    const label = nextFlightPathLabel(observations, surveyorId, surface);
    return strokes.map((stroke) => ({ ...stroke, pathKey, label }));
}

/** The strokes to store when an observation reuses `group`: a copy carrying the path's key and letter. */
export function copyFlightPath(group: FlightPathGroup): FlightPath[] {
    return group.paths.map((stroke) => ({ ...stroke, pathKey: group.key, label: group.letter }));
}

/** An error message, or `null` when the observation holds at most one path per surface. */
export function validateFlightPaths(observation: Observation): string | null {
    for (const surface of SURFACES) {
        const strokes = flightPathsOn(observation, surface);
        const keys = new Set(strokes.map((s) => s.pathKey ?? ''));
        const labels = new Set(strokes.map((s) => s.label ?? ''));
        if (keys.size > 1 || labels.size > 1) return 'Only one flight path can be recorded per image';
    }
    return null;
}

function compareByCreation(a: Observation, b: Observation): number {
    const diff = a.createdAt.getTime() - b.createdAt.getTime();
    if (diff !== 0) return diff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

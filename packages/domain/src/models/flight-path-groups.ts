import type {
    FlightPath,
    FlightPathLink,
    FlightPathSurface,
    Observation,
    UpdateObservationInput,
} from './observation';

const SURFACES: FlightPathSurface[] = ['boundary', 'frontView'];

export interface FlightPathGroup {
    letter: string;
    surveyorId: string;
    surface: FlightPathSurface;
    sourceObservationId: string;
    paths: FlightPath[];
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

export function ownedFlightPaths(observation: Observation, surface: FlightPathSurface): FlightPath[] {
    return observation.flightPaths.filter((path) => path.surface === surface);
}

export function flightPathLinkFor(
    observation: Observation,
    surface: FlightPathSurface,
): FlightPathLink | undefined {
    return observation.flightPathLinks.find((link) => link.surface === surface);
}

/** Letters follow the order paths were drawn, so a redrawn path never takes an older path's letter. */
export function buildFlightPathGroups(
    observations: Observation[],
    surveyorId: string,
    surface: FlightPathSurface,
): FlightPathGroup[] {
    const mine = observations.filter((o) => o.surveyorId === surveyorId).sort(compareByCreation);
    const drawnAt = (o: Observation) =>
        Math.min(...ownedFlightPaths(o, surface).map((p) => p.createdAt ?? o.createdAt.getTime()));
    return mine
        .filter((o) => ownedFlightPaths(o, surface).length > 0)
        .sort((a, b) => drawnAt(a) - drawnAt(b) || compareByCreation(a, b))
        .map((source, index) => ({
            letter: letterFor(index),
            surveyorId,
            surface,
            sourceObservationId: source.id,
            paths: ownedFlightPaths(source, surface),
            memberObservationIds: [
                source.id,
                ...mine
                    .filter((o) => o.id !== source.id && flightPathLinkFor(o, surface)?.observationId === source.id)
                    .map((o) => o.id),
            ],
        }));
}

/** The letter of the path `observation` drew or links to on `surface`, if any. */
export function flightPathLetter(
    observation: Observation,
    observations: Observation[],
    surface: FlightPathSurface,
): string | undefined {
    return buildFlightPathGroups(observations, observation.surveyorId, surface)
        .find((group) => group.memberObservationIds.includes(observation.id))?.letter;
}

/** The points an observation shows on `surface`: its own strokes, else those of the path it links to. */
export function resolveFlightPaths(
    observation: Observation,
    observations: Observation[],
    surface: FlightPathSurface,
): FlightPath[] {
    const own = ownedFlightPaths(observation, surface);
    if (own.length > 0) return own;
    const link = flightPathLinkFor(observation, surface);
    if (!link) return [];
    const source = observations.find((o) => o.id === link.observationId);
    return source ? ownedFlightPaths(source, surface) : [];
}

/** Returns an error message, or `null` when every link is valid. */
export function validateFlightPathLinks(
    observation: Observation,
    observations: Observation[],
): string | null {
    const seen = new Set<FlightPathSurface>();
    for (const link of observation.flightPathLinks) {
        if (seen.has(link.surface)) return 'Only one flight path can be linked per image';
        seen.add(link.surface);
        if (link.observationId === observation.id) return 'An observation cannot link to its own flight path';
        if (ownedFlightPaths(observation, link.surface).length > 0) {
            return 'Cannot both draw and link a flight path on the same image';
        }
        const target = observations.find((o) => o.id === link.observationId);
        if (!target) return 'Linked flight path not found';
        if (target.surveyId !== observation.surveyId || target.surveyorId !== observation.surveyorId) {
            return 'Can only link to your own flight paths';
        }
        if (link.surface === 'frontView' && target.locationId !== observation.locationId) {
            return 'Front-view flight paths can only be linked within the same location';
        }
        if (ownedFlightPaths(target, link.surface).length === 0) {
            return 'Linked observation has no flight path on that image';
        }
    }
    return null;
}

export interface FlightPathTransfer {
    observationId: string;
    input: Required<Pick<UpdateObservationInput, 'flightPaths' | 'flightPathLinks'>>;
}

/**
 * When `before` stops owning a path that others link to (deleted, unlinked or
 * redrawn), hand the old strokes to the earliest-created dependent and re-point
 * the remaining dependents at it, so linked observations keep their path.
 */
export function planFlightPathTransfer(
    before: Observation,
    after: Observation | null,
    observations: Observation[],
): FlightPathTransfer[] {
    const patched = new Map<string, Observation>();
    const current = (o: Observation) => patched.get(o.id) ?? o;

    for (const surface of SURFACES) {
        const owned = ownedFlightPaths(before, surface);
        if (owned.length === 0) continue;
        if (after && sameFlightPathIds(owned, ownedFlightPaths(after, surface))) continue;

        const [heir, ...rest] = observations
            .filter((o) => o.id !== before.id && flightPathLinkFor(o, surface)?.observationId === before.id)
            .sort(compareByCreation);
        if (!heir) continue;

        const h = current(heir);
        patched.set(heir.id, {
            ...h,
            flightPaths: [...h.flightPaths, ...owned],
            flightPathLinks: h.flightPathLinks.filter((l) => l.surface !== surface),
        });
        for (const dependent of rest) {
            const d = current(dependent);
            patched.set(dependent.id, {
                ...d,
                flightPathLinks: d.flightPathLinks.map((l) =>
                    l.surface === surface ? { surface, observationId: heir.id } : l,
                ),
            });
        }
    }

    return [...patched.values()].map((o) => ({
        observationId: o.id,
        input: { flightPaths: o.flightPaths, flightPathLinks: o.flightPathLinks },
    }));
}

export function sameFlightPathIds(a: FlightPath[], b: FlightPath[]): boolean {
    return a.length === b.length && a.every((path, i) => path.id === b[i].id);
}

function compareByCreation(a: Observation, b: Observation): number {
    const diff = a.createdAt.getTime() - b.createdAt.getTime();
    if (diff !== 0) return diff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

import { describe, expect, it } from 'vitest';
import type {
  FlightPath,
  Location,
  MediaAsset,
  Observation,
  Survey,
  SurveyContext,
  Surveyor,
} from '@bapp/domain';
import { normalizeReport } from '../normalize';
import { FIGURE_PALETTE } from '../colors';

const EPOCH = new Date('2026-01-01T00:00:00.000Z');

function media(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    sourceRef: 'src/ref',
    renderRef: 'render/ref',
    status: 'ready',
    error: null,
    ...overrides,
  };
}

function survey(overrides: Partial<Survey> = {}): Survey {
  return {
    id: 'svy_1',
    adminCode: 'ADMIN1',
    surveyorCode: 'SURV01',
    name: 'Test survey',
    postcode: 'AB1 2CD',
    date: EPOCH,
    sunsetTime: null,
    startTime: null,
    endTime: null,
    boundary: null,
    status: 'active',
    weather: {},
    data: {},
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  };
}

function surveyor(id: string, overrides: Partial<Surveyor> = {}): Surveyor {
  return {
    id,
    surveyId: 'svy_1',
    locationId: null,
    name: `Surveyor ${id}`,
    isLead: false,
    status: 'ready',
    data: {},
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  };
}

function location(id: string, overrides: Partial<Location> = {}): Location {
  return {
    id,
    surveyId: 'svy_1',
    name: `Location ${id}`,
    boundaryPosition: null,
    frontViewImage: null,
    equipmentImage: null,
    data: {},
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  };
}

function flightPath(surface: FlightPath['surface'], id: string): FlightPath {
  return {
    id,
    surface,
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.4 },
    ],
  };
}

function observation(
  id: string,
  overrides: Partial<Observation> = {},
): Observation {
  return {
    id,
    surveyId: 'svy_1',
    locationId: 'loc_1',
    surveyorId: 'sur_1',
    species: 'Common Pipistrelle',
    firstSeenAt: EPOCH,
    lastSeenAt: null,
    seenCount: 1,
    heardCount: 0,
    frequency: null,
    direction: null,
    notes: null,
    emergence: false,
    flightPaths: [],
    data: {},
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  };
}

function context(overrides: Partial<SurveyContext> = {}): SurveyContext {
  return {
    survey: survey(),
    surveyors: [surveyor('sur_1')],
    locations: [location('loc_1')],
    observations: [],
    ...overrides,
  };
}

describe('normalizeReport', () => {
  it('maps survey, surveyor and location meta', () => {
    const model = normalizeReport(context());

    expect(model.survey).toEqual({
      id: 'svy_1',
      name: 'Test survey',
      postcode: 'AB1 2CD',
      date: EPOCH,
      status: 'active',
      weather: {
        temperature: null,
        wind: null,
        humidity: null,
        rain: null,
        cloudCover: null,
      },
    });
    expect(model.surveyors).toEqual([
      { id: 'sur_1', name: 'Surveyor sur_1', isLead: false, status: 'ready' },
    ]);
    expect(model.locations).toEqual([{ id: 'loc_1', name: 'Location loc_1' }]);
  });

  it('emits no figures when there are no base images', () => {
    const model = normalizeReport(context());
    expect(model.figures).toEqual([]);
  });

  it('emits a boundary figure (birds-eye) when the survey has a boundary image', () => {
    const model = normalizeReport(
      context({
        survey: survey({ boundary: media({ renderRef: 'boundary/render.png' }) }),
        observations: [
          observation('obs_1', {
            flightPaths: [flightPath('boundary', 'fp_1'), flightPath('frontView', 'fp_2')],
          }),
        ],
      }),
    );

    expect(model.figures).toHaveLength(1);
    const [boundary] = model.figures;
    expect(boundary.figureId).toBe('boundary');
    expect(boundary.kind).toBe('boundary');
    expect(boundary.imageRef).toBe('boundary/render.png');
    // Only the boundary-surface path is collected onto the boundary figure.
    expect(boundary.paths).toHaveLength(1);
    expect(boundary.paths[0].observationId).toBe('obs_1');
  });

  it('emits one front-view figure per location that has a front-view image', () => {
    const model = normalizeReport(
      context({
        locations: [
          location('loc_1', { frontViewImage: media({ renderRef: 'loc1/front.png' }) }),
          location('loc_2'), // no image → no figure
        ],
        observations: [
          observation('obs_1', {
            locationId: 'loc_1',
            flightPaths: [flightPath('frontView', 'fp_1')],
          }),
          observation('obs_2', {
            locationId: 'loc_2',
            flightPaths: [flightPath('frontView', 'fp_2')],
          }),
        ],
      }),
    );

    expect(model.figures.map((f) => f.figureId)).toEqual(['loc_loc_1']);
    const [figure] = model.figures;
    expect(figure.kind).toBe('frontView');
    expect(figure.locationId).toBe('loc_1');
    // Only obs_1 belongs to loc_1, so only its path is collected.
    expect(figure.paths.map((p) => p.observationId)).toEqual(['obs_1']);
  });

  it('orders figures boundary-first, then locations', () => {
    const model = normalizeReport(
      context({
        survey: survey({ boundary: media() }),
        locations: [location('loc_1', { frontViewImage: media() })],
        observations: [],
      }),
    );

    expect(model.figures.map((f) => f.figureId)).toEqual(['boundary', 'loc_loc_1']);
  });

  it('orders observations chronologically and assigns colors deterministically regardless of input order', () => {
    const early = observation('obs_early', {
      firstSeenAt: new Date('2026-01-01T20:00:00.000Z'),
    });
    const late = observation('obs_late', {
      firstSeenAt: new Date('2026-01-01T22:00:00.000Z'),
    });

    const forwards = normalizeReport(context({ observations: [early, late] }));
    const backwards = normalizeReport(context({ observations: [late, early] }));

    expect(forwards.observations.map((o) => o.id)).toEqual(['obs_early', 'obs_late']);
    expect(backwards.observations.map((o) => o.id)).toEqual(['obs_early', 'obs_late']);

    // Color is tied to chronological position, not input order.
    const forwardColors = new Map(forwards.observations.map((o) => [o.id, o.color]));
    const backwardColors = new Map(backwards.observations.map((o) => [o.id, o.color]));
    expect(forwardColors.get('obs_early')).toBe(FIGURE_PALETTE[0]);
    expect(forwardColors.get('obs_late')).toBe(FIGURE_PALETTE[1]);
    expect(backwardColors).toEqual(forwardColors);
  });

  it('labels flight paths by observation id, first-seen time and species, falling back to "Unknown species"', () => {
    const model = normalizeReport(
      context({
        observations: [
          observation('obs_1', { species: 'Noctule', firstSeenAt: EPOCH }),
          observation('obs_2', {
            species: null,
            firstSeenAt: new Date('2026-01-01T21:00:00.000Z'),
          }),
        ],
      }),
    );

    const labels = new Map(model.observations.map((o) => [o.id, o.label]));
    expect(labels.get('obs_1')).toBe('obs_1 - 00:00 - Noctule');
    expect(labels.get('obs_2')).toBe('obs_2 - 21:00 - Unknown species');
  });

  it('shares one color across all paths of the same observation', () => {
    const model = normalizeReport(
      context({
        survey: survey({ boundary: media() }),
        observations: [
          observation('obs_1', {
            flightPaths: [flightPath('boundary', 'fp_1'), flightPath('boundary', 'fp_2')],
          }),
        ],
      }),
    );

    const [boundary] = model.figures;
    expect(boundary.paths).toHaveLength(2);
    expect(boundary.paths[0].color).toBe(boundary.paths[1].color);
  });

  it('omits figures without a ready renderRef', () => {
    const model = normalizeReport(
      context({
        survey: survey({
          boundary: media({ renderRef: null, sourceRef: 'boundary/source.pdf' }),
        }),
      }),
    );

    expect(model.figures).toEqual([]);
  });

  it('emits an equipment figure (no paths) per location with an equipment image', () => {
    const model = normalizeReport(
      context({
        locations: [
          location('loc_1', { equipmentImage: media({ renderRef: 'loc1/equip.png' }) }),
          location('loc_2'), // no equipment image → no figure
        ],
      }),
    );

    const equipment = model.figures.filter((f) => f.kind === 'equipment');
    expect(equipment).toHaveLength(1);
    expect(equipment[0].figureId).toBe('equip_loc_1');
    expect(equipment[0].imageRef).toBe('loc1/equip.png');
    expect(equipment[0].title).toBe('Location loc_1 — equipment');
    expect(equipment[0].paths).toEqual([]);
    expect(equipment[0].pins).toEqual([]);
  });

  it('orders figures boundary, front-view, then equipment', () => {
    const model = normalizeReport(
      context({
        survey: survey({ boundary: media() }),
        locations: [
          location('loc_1', {
            frontViewImage: media({ renderRef: 'loc1/front.png' }),
            equipmentImage: media({ renderRef: 'loc1/equip.png' }),
          }),
        ],
      }),
    );

    expect(model.figures.map((f) => f.kind)).toEqual([
      'boundary',
      'frontView',
      'equipment',
    ]);
  });

  it('renders location pins on the boundary figure with assigned surveyor names', () => {
    const model = normalizeReport(
      context({
        survey: survey({ boundary: media() }),
        surveyors: [
          surveyor('sur_1', { locationId: 'loc_1', name: 'Ada' }),
          surveyor('sur_2', { locationId: 'loc_1', name: 'Grace' }),
          surveyor('sur_3', { locationId: 'loc_2', name: 'Elsewhere' }),
        ],
        locations: [
          location('loc_1', {
            name: 'North elevation',
            boundaryPosition: { x: 0.25, y: 0.75 },
          }),
          location('loc_2'), // no boundaryPosition → no pin
        ],
      }),
    );

    const boundary = model.figures.find((f) => f.kind === 'boundary')!;
    expect(boundary.pins).toEqual([
      {
        locationId: 'loc_1',
        label: 'North elevation',
        x: 0.25,
        y: 0.75,
        surveyorNames: ['Ada', 'Grace'],
      },
    ]);
  });

  it('emits pins with an empty surveyor list when no surveyor is assigned', () => {
    const model = normalizeReport(
      context({
        survey: survey({ boundary: media() }),
        surveyors: [],
        locations: [
          location('loc_1', { name: null, boundaryPosition: { x: 0.1, y: 0.2 } }),
        ],
      }),
    );

    const boundary = model.figures.find((f) => f.kind === 'boundary')!;
    expect(boundary.pins).toEqual([
      { locationId: 'loc_1', label: 'Location', x: 0.1, y: 0.2, surveyorNames: [] },
    ]);
  });

  it('names unnamed assigned surveyors on a pin', () => {
    const model = normalizeReport(
      context({
        survey: survey({ boundary: media() }),
        surveyors: [surveyor('sur_1', { locationId: 'loc_1', name: null })],
        locations: [location('loc_1', { boundaryPosition: { x: 0.5, y: 0.5 } })],
      }),
    );

    const boundary = model.figures.find((f) => f.kind === 'boundary')!;
    expect(boundary.pins[0].surveyorNames).toEqual(['Unnamed surveyor']);
  });

  it('surfaces known weather readings and coerces them to strings', () => {
    const model = normalizeReport(
      context({
        survey: survey({
          weather: { temperature: 15, wind: '4', humidity: '', rain: 'Wet' },
        }),
      }),
    );

    expect(model.survey.weather).toEqual({
      temperature: '15',
      wind: '4',
      humidity: null, // empty string → null
      rain: 'Wet',
      cloudCover: null, // absent → null
    });
  });

  it('carries the emergence flag through to observations', () => {
    const model = normalizeReport(
      context({
        observations: [
          observation('obs_1', { emergence: true, firstSeenAt: EPOCH }),
          observation('obs_2', {
            emergence: false,
            firstSeenAt: new Date('2026-01-01T21:00:00.000Z'),
          }),
        ],
      }),
    );

    const flags = new Map(model.observations.map((o) => [o.id, o.emergence]));
    expect(flags.get('obs_1')).toBe(true);
    expect(flags.get('obs_2')).toBe(false);
  });
});

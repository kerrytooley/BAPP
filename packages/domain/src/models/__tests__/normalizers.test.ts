import { describe, it, expect } from 'vitest';
import { applySurveyDefaults } from '../survey';
import { applyLocationDefaults } from '../location';
import { applySurveyorDefaults } from '../surveyor';
import { applyObservationDefaults } from '../observation';

// These normalizers are the single source of truth for "what a new entity is",
// shared by every repository backend so in-memory and Firebase can't drift.

describe('applySurveyDefaults', () => {
  it('applies business defaults for a minimal input', () => {
    const fields = applySurveyDefaults({ adminCode: 'abc123', surveyorCode: 'def456' });
    expect(fields).toEqual({
      adminCode: 'abc123',
      surveyorCode: 'def456',
      name: null,
      postcode: null,
      date: null,
      sunsetTime: null,
      startTime: null,
      endTime: null,
      boundary: null,
      status: 'draft',
      weather: {},
      data: {},
    });
  });

  it('passes provided values through unchanged', () => {
    const date = new Date('2026-06-15T20:00:00Z');
    const fields = applySurveyDefaults({
      adminCode: 'aaa',
      surveyorCode: 'bbb',
      name: 'Bat Survey',
      postcode: 'SW1A 1AA',
      date,
      status: 'active',
      weather: { temp: 15 },
      data: { note: 'x' },
    });
    expect(fields.name).toBe('Bat Survey');
    expect(fields.postcode).toBe('SW1A 1AA');
    expect(fields.date).toBe(date);
    expect(fields.status).toBe('active');
    expect(fields.weather).toEqual({ temp: 15 });
    expect(fields.data).toEqual({ note: 'x' });
  });

  it('passes join codes through without inventing them', () => {
    const fields = applySurveyDefaults({ adminCode: 'ADMIN', surveyorCode: 'SURV' });
    expect(fields.adminCode).toBe('ADMIN');
    expect(fields.surveyorCode).toBe('SURV');
  });
});

describe('applyLocationDefaults', () => {
  it('applies business defaults for a minimal input', () => {
    const fields = applyLocationDefaults({ surveyId: 's1' });
    expect(fields).toEqual({
      surveyId: 's1',
      name: null,
      boundaryPosition: null,
      frontViewImage: null,
      equipmentImage: null,
      data: {},
    });
  });

  it('passes provided values through unchanged', () => {
    const fields = applyLocationDefaults({
      surveyId: 's1',
      name: 'North Gate',
      boundaryPosition: { x: 0.4, y: 0.3 },
      data: { k: 1 },
    });
    expect(fields.name).toBe('North Gate');
    expect(fields.boundaryPosition).toEqual({ x: 0.4, y: 0.3 });
    expect(fields.data).toEqual({ k: 1 });
  });
});

describe('applySurveyorDefaults', () => {
  it('applies business defaults for a minimal input', () => {
    const fields = applySurveyorDefaults({ surveyId: 's1' });
    expect(fields).toEqual({
      surveyId: 's1',
      locationId: null,
      name: null,
      isLead: false,
      status: 'pending',
      data: {},
    });
  });

  it('passes provided values through unchanged', () => {
    const fields = applySurveyorDefaults({
      surveyId: 's1',
      locationId: 'loc1',
      name: 'Alice',
      isLead: true,
      status: 'ready',
    });
    expect(fields.locationId).toBe('loc1');
    expect(fields.name).toBe('Alice');
    expect(fields.isLead).toBe(true);
    expect(fields.status).toBe('ready');
  });
});

describe('applyObservationDefaults', () => {
  it('applies business defaults for a minimal input', () => {
    const fields = applyObservationDefaults({ surveyId: 's1', locationId: 'l1', surveyorId: 'sv1' });
    expect(fields).toEqual({
      surveyId: 's1',
      locationId: 'l1',
      surveyorId: 'sv1',
      species: null,
      firstSeenAt: null,
      lastSeenAt: null,
      seenCount: 0,
      heardCount: 0,
      notes: null,
      frequency: null,
      direction: null,
      emergence: false,
      flightPaths: [],
      data: {},
    });
  });

  it('passes provided values through unchanged', () => {
    const flightPaths = [{ id: 'fp1', surface: 'boundary' as const, points: [{ x: 0, y: 0 }] }];
    const fields = applyObservationDefaults({
      surveyId: 's1',
      locationId: 'l1',
      surveyorId: 'sv1',
      species: 'Pipistrelle',
      seenCount: 3,
      heardCount: 5,
      flightPaths,
    });
    expect(fields.species).toBe('Pipistrelle');
    expect(fields.seenCount).toBe(3);
    expect(fields.heardCount).toBe(5);
    expect(fields.flightPaths).toBe(flightPaths);
  });
});

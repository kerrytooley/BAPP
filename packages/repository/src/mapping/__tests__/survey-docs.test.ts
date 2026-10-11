import { describe, it, expect } from 'vitest';
import {
  buildSurveyContext,
  locationFromData,
  surveyExportFromData,
  toDateOrNull,
} from '../survey-docs';

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

describe('survey-docs mapping', () => {
  it('converts any SDK Timestamp (duck-typed), Dates and nulls', () => {
    expect(toDateOrNull(ts('2026-10-01T00:00:00Z'))).toEqual(new Date('2026-10-01T00:00:00Z'));
    const date = new Date();
    expect(toDateOrNull(date)).toBe(date);
    expect(toDateOrNull(null)).toBeNull();
    expect(toDateOrNull('nope')).toBeNull();
  });

  it('converts nested location note times', () => {
    const location = locationFromData('loc_1', {
      surveyId: 's',
      notes: [{ text: 'hi', time: ts('2026-10-01T20:00:00Z') }, {}],
    });
    expect(location.notes).toEqual([
      { text: 'hi', time: new Date('2026-10-01T20:00:00Z') },
      { text: '', time: new Date(0) },
    ]);
  });

  it('builds a survey context with converted dates', () => {
    const context = buildSurveyContext({
      survey: { id: 's', data: { status: 'completed', updatedAt: ts('2026-10-01T00:00:00Z') } },
      locations: [],
      surveyors: [{ id: 'a', data: { surveyId: 's' } }],
      observations: [{ id: 'o', data: { firstSeenAt: ts('2026-10-01T21:00:00Z') } }],
    });
    expect(context.survey.status).toBe('completed');
    expect(context.survey.updatedAt).toEqual(new Date('2026-10-01T00:00:00Z'));
    expect(context.surveyors.map((s) => s.id)).toEqual(['a']);
    expect(context.observations[0].firstSeenAt).toEqual(new Date('2026-10-01T21:00:00Z'));
  });

  it('maps export records with safe defaults', () => {
    expect(surveyExportFromData(undefined)).toEqual({
      status: 'generating', storagePath: null, fileName: null, fingerprint: null,
      missingMedia: [], generatedAt: null, lastRequestId: null, error: null,
    });
    expect(surveyExportFromData({ status: 'ready', generatedAt: ts('2026-10-01T00:00:00Z') }).generatedAt)
      .toEqual(new Date('2026-10-01T00:00:00Z'));
  });
});

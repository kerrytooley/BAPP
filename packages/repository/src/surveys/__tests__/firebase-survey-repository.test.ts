import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getDocFromCache } = vi.hoisted(() => ({ getDocFromCache: vi.fn() }));

vi.mock('@react-native-firebase/firestore', () => ({
  Timestamp: class {},
  collection: vi.fn(),
  doc: vi.fn(() => ({})),
  getDocFromCache,
  getDocFromServer: vi.fn(),
  getDocsFromCache: vi.fn(),
  getDocsFromServer: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
}));
vi.mock('../../config/firebase-app', () => ({ getDb: vi.fn(() => ({})) }));

import { FirebaseSurveyRepository } from '../firebase-survey-repository';

function snapOf(data: Record<string, unknown>) {
  return { id: 'survey-1', exists: () => true, data: () => data };
}

describe('FirebaseSurveyRepository weather mapping', () => {
  const repo = new FirebaseSurveyRepository();

  beforeEach(() => getDocFromCache.mockReset());

  it('maps missing or null weather to null, matching the domain default', async () => {
    getDocFromCache.mockResolvedValue(snapOf({ adminCode: 'a', surveyorCode: 'b', endWeather: null }));
    const survey = await repo.findById('survey-1');
    expect(survey?.startWeather).toBeNull();
    expect(survey?.endWeather).toBeNull();
  });

  it('passes recorded weather through unchanged', async () => {
    const weather = { temperature: '12', cloudCover: '50', humidity: '70', wind: '3', rain: 'Dry' };
    getDocFromCache.mockResolvedValue(snapOf({ adminCode: 'a', surveyorCode: 'b', startWeather: weather }));
    const survey = await repo.findById('survey-1');
    expect(survey?.startWeather).toEqual(weather);
    expect(survey?.endWeather).toBeNull();
  });
});

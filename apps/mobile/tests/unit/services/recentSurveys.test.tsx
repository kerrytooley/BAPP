import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    forgetRecentSurvey,
    loadRecentSurveys,
    pruneExpired,
    RECENT_SURVEYS_KEY,
    recordRecentSurvey,
    removeRecent,
    upsertRecent,
    type RecentSurvey,
} from '@services/recentSurveys';
import { buildSurvey } from '../../helpers/factories';

const entry = (overrides: Partial<RecentSurvey> = {}): RecentSurvey => ({
    surveyId: 'survey-1',
    role: 'admin',
    name: 'Dusk count',
    postcode: 'SW1A 1AA',
    surveyCreatedAt: '2026-10-01T00:00:00.000Z',
    lastOpenedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
});

describe('upsertRecent', () => {
    it('adds new entries newest first and keys by survey and role', () => {
        const list = upsertRecent([entry()], entry({ role: 'surveyor', lastOpenedAt: '2026-10-02T00:00:00.000Z' }));
        expect(list.map((e) => e.role)).toEqual(['surveyor', 'admin']);
    });

    it('replaces an existing entry but keeps a remembered surveyor', () => {
        const list = upsertRecent(
            [entry({ role: 'surveyor', surveyorId: 's-1' })],
            entry({ role: 'surveyor', name: 'Renamed', lastOpenedAt: '2026-10-03T00:00:00.000Z' }),
        );
        expect(list).toHaveLength(1);
        expect(list[0]).toEqual(expect.objectContaining({ name: 'Renamed', surveyorId: 's-1' }));
    });
});

describe('removeRecent', () => {
    it('removes only the matching survey and role', () => {
        const list = removeRecent([entry(), entry({ role: 'surveyor' })], { surveyId: 'survey-1', role: 'admin' });
        expect(list.map((e) => e.role)).toEqual(['surveyor']);
    });
});

describe('pruneExpired', () => {
    it('drops surveys created more than 90 days ago', () => {
        const now = new Date('2026-10-09T00:00:00.000Z');
        const list = pruneExpired([
            entry({ surveyId: 'fresh', surveyCreatedAt: '2026-07-12T00:00:00.000Z' }),
            entry({ surveyId: 'expired', surveyCreatedAt: '2026-07-10T00:00:00.000Z' }),
        ], now);
        expect(list.map((e) => e.surveyId)).toEqual(['fresh']);
    });
});

describe('storage', () => {
    it('records, loads and forgets surveys', async () => {
        const survey = buildSurvey({ id: 'survey-9', createdAt: new Date('2026-10-01T00:00:00.000Z') });
        await recordRecentSurvey(survey, 'surveyor', 's-1', new Date('2026-10-05T00:00:00.000Z'));

        expect(await loadRecentSurveys(new Date('2026-10-09T00:00:00.000Z'))).toEqual([
            expect.objectContaining({ surveyId: 'survey-9', role: 'surveyor', surveyorId: 's-1', name: 'Dusk count' }),
        ]);

        await forgetRecentSurvey('survey-9', 'surveyor');
        expect(await loadRecentSurveys()).toEqual([]);
    });

    it('persists the pruned list when expired surveys are dropped', async () => {
        await AsyncStorage.setItem(RECENT_SURVEYS_KEY, JSON.stringify([entry({ surveyCreatedAt: '2026-01-01T00:00:00.000Z' })]));
        expect(await loadRecentSurveys(new Date('2026-10-09T00:00:00.000Z'))).toEqual([]);
        expect(await AsyncStorage.getItem(RECENT_SURVEYS_KEY)).toBe('[]');
    });

    it('ignores corrupt or malformed data', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await AsyncStorage.setItem(RECENT_SURVEYS_KEY, '{not json');
        expect(await loadRecentSurveys()).toEqual([]);

        await AsyncStorage.setItem(RECENT_SURVEYS_KEY, JSON.stringify({ not: 'a list' }));
        expect(await loadRecentSurveys()).toEqual([]);

        await AsyncStorage.setItem(RECENT_SURVEYS_KEY, JSON.stringify([{ surveyId: 1 }, entry()]));
        expect(await loadRecentSurveys(new Date('2026-10-09T00:00:00.000Z'))).toHaveLength(1);
        errorSpy.mockRestore();
    });

    it('never throws when storage fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
        await expect(recordRecentSurvey(buildSurvey(), 'admin')).resolves.toBeUndefined();
        expect(errorSpy).toHaveBeenCalledWith('Failed to save recent surveys', expect.any(Error));

        await expect(recordRecentSurvey({ ...buildSurvey(), createdAt: undefined } as never, 'admin')).resolves.toBeUndefined();
        expect(errorSpy).toHaveBeenCalledWith('Failed to record recent survey', expect.any(Error));
        errorSpy.mockRestore();
    });
});

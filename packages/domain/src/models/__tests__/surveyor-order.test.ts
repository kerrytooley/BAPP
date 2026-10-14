import { describe, it, expect } from 'vitest';
import { compareSurveyors, type Surveyor } from '../surveyor';

const surveyor = (id: string, minute: number, isLead = false): Surveyor => ({
    id,
    surveyId: 's1',
    locationId: null,
    name: id,
    isLead,
    status: 'pending',
    data: {},
    createdAt: new Date(2026, 0, 1, 12, minute),
    updatedAt: new Date(2026, 0, 1, 12, minute),
});

describe('compareSurveyors', () => {
    it('puts the lead first, then orders by when surveyors were added', () => {
        const sorted = [surveyor('c', 3), surveyor('lead', 9, true), surveyor('a', 1), surveyor('b', 1)]
            .sort(compareSurveyors)
            .map((s) => s.id);
        expect(sorted).toEqual(['lead', 'a', 'b', 'c']);
    });
});

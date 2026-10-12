import { describe, it, expect } from 'vitest';
import { surveySchedule } from '../survey';

const time = (h: number, m = 0) => new Date(2020, 0, 1, h, m);

describe('surveySchedule', () => {
    it('anchors each time to the survey date', () => {
        const schedule = surveySchedule({
            date: new Date(2026, 9, 11),
            startTime: time(19, 30),
            sunsetTime: time(19, 45),
            endTime: time(21, 30),
        });
        expect(schedule).toEqual({
            start: new Date(2026, 9, 11, 19, 30),
            sunset: new Date(2026, 9, 11, 19, 45),
            end: new Date(2026, 9, 11, 21, 30),
        });
    });

    it('moves times earlier than the start onto the next day', () => {
        const schedule = surveySchedule({
            date: new Date(2026, 11, 31),
            startTime: time(22, 30),
            sunsetTime: time(23, 15),
            endTime: time(0, 45),
        });
        expect(schedule.sunset).toEqual(new Date(2026, 11, 31, 23, 15));
        expect(schedule.end).toEqual(new Date(2027, 0, 1, 0, 45));
    });

    it('falls back to the time\'s own day without a survey date or start', () => {
        expect(surveySchedule({ date: null, startTime: time(20), sunsetTime: null, endTime: time(1) })).toEqual({
            start: new Date(2020, 0, 1, 20),
            sunset: null,
            end: new Date(2020, 0, 2, 1),
        });
        expect(surveySchedule({ date: new Date(2026, 9, 11), startTime: null, sunsetTime: null, endTime: time(1) }).end)
            .toEqual(new Date(2026, 9, 11, 1));
        expect(surveySchedule({ date: null, startTime: null, sunsetTime: null, endTime: null }))
            .toEqual({ start: null, sunset: null, end: null });
    });
});

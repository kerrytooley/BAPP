import { getSetupRows, getSurveyorRows, worstStatus, type StatusRow } from '@utils/surveyStatus';
import type { MediaAsset } from '@bapp/domain';
import { buildContext, buildLocation, buildSurvey, buildSurveyor } from '../../helpers/factories';

const asset = (status: MediaAsset['status'] = 'ready'): MediaAsset => ({ sourceRef: 'a', renderRef: 'a', status, error: null });
const statusOf = (rows: StatusRow[], key: string) => rows.find((r) => r.key === key);
const fullWeather = { temperature: '12', cloudCover: '10', humidity: '70', wind: '2', rain: 'Dry' };

describe('worstStatus', () => {
    const row = (status: StatusRow['status']): StatusRow => ({ key: status, label: status, status });

    it('picks missing over incomplete over complete', () => {
        expect(worstStatus([])).toBe('complete');
        expect(worstStatus([row('complete'), row('incomplete')])).toBe('incomplete');
        expect(worstStatus([row('incomplete'), row('missing'), row('complete')])).toBe('missing');
    });
});

describe('getSetupRows', () => {
    const rows = (overrides: Parameters<typeof buildContext>[0]) => getSetupRows(buildContext(overrides));

    it('rates survey details by how many fields are filled', () => {
        expect(statusOf(rows({ survey: buildSurvey() }), 'details')?.status).toBe('complete');
        expect(statusOf(rows({ survey: buildSurvey({ postcode: ' ', date: null }) }), 'details')?.status).toBe('incomplete');
        expect(statusOf(rows({
            survey: buildSurvey({ name: null, postcode: null, date: null, startTime: null, endTime: null, sunsetTime: null }),
        }), 'details')?.status).toBe('missing');
    });

    it('rates the boundary by upload state', () => {
        expect(statusOf(rows({ survey: buildSurvey({ boundary: asset() }) }), 'boundary')?.status).toBe('complete');
        expect(statusOf(rows({ survey: buildSurvey({ boundary: asset('processing') }) }), 'boundary')?.status).toBe('incomplete');
        expect(statusOf(rows({ survey: buildSurvey({ boundary: null }) }), 'boundary')?.status).toBe('missing');
    });

    it('rates surveyors by names and, with a boundary, pins', () => {
        const lead = buildSurveyor({ id: 'lead', isLead: true, name: 'Ada', locationId: 'loc' });
        const pinned = [buildLocation({ id: 'loc' })];

        expect(statusOf(rows({ surveyors: [], locations: [] }), 'surveyors')?.status).toBe('missing');
        expect(statusOf(rows({ surveyors: [{ ...lead, name: ' ' }] }), 'surveyors')?.status).toBe('missing');
        expect(statusOf(rows({ surveyors: [lead], locations: pinned }), 'surveyors')?.status).toBe('complete');
        expect(statusOf(rows({
            surveyors: [lead, buildSurveyor({ id: 'b', isLead: false, name: '' })], locations: pinned,
        }), 'surveyors')?.status).toBe('incomplete');
        expect(statusOf(rows({
            survey: buildSurvey({ boundary: asset() }), surveyors: [{ ...lead, locationId: null }], locations: [],
        }), 'surveyors')?.status).toBe('incomplete');
        expect(statusOf(rows({ surveyors: [{ ...lead, isLead: false }], locations: pinned }), 'surveyors')?.status).toBe('incomplete');
    });
});

describe('getSurveyorRows', () => {
    const completeLocation = buildLocation({
        id: 'loc',
        frontViewImage: asset(),
        equipmentImage: asset(),
        equipmentInformation: { audioLabel: 'A1', videoLabel: 'V1', otherInfo: 'Bat detector' },
    });
    const rowsFor = ({ isLead = true, location = completeLocation, survey = buildSurvey({ startWeather: fullWeather }), name = 'Ada' } = {}) =>
        getSurveyorRows(
            buildContext({
                survey,
                surveyors: [buildSurveyor({ id: 's', isLead, name, locationId: 'loc' })],
                locations: [location],
            }),
            's',
        );

    it('reports only setup rows, all complete when everything is filled in', () => {
        const rows = rowsFor();
        expect(rows.map((r) => r.key)).toEqual(['name', 'location', 'startWeather', 'frontView', 'equipmentPhoto', 'equipmentDetails', 'endWeather']);
        expect(worstStatus(rows)).toBe('complete');
    });

    it('skips weather for non-lead surveyors', () => {
        const keys = rowsFor({ isLead: false }).map((r) => r.key);
        expect(keys).not.toContain('startWeather');
        expect(keys).not.toContain('endWeather');
    });

    it('marks the location as not required without a boundary', () => {
        expect(statusOf(rowsFor({ location: { ...completeLocation, boundaryPosition: null } }), 'location'))
            .toEqual(expect.objectContaining({ status: 'complete', detail: 'Not required' }));
    });

    it('requires a pin when there is a boundary', () => {
        const survey = buildSurvey({ boundary: asset(), startWeather: fullWeather });
        expect(statusOf(rowsFor({ survey }), 'location')?.status).toBe('complete');
        expect(statusOf(rowsFor({ survey, location: { ...completeLocation, boundaryPosition: null } }), 'location')?.status).toBe('missing');
    });

    it('flags missing, partial and failed data', () => {
        const rows = rowsFor({
            name: '',
            survey: buildSurvey({ startWeather: { ...fullWeather, wind: '', rain: '' }, endWeather: null }),
            location: {
                ...completeLocation,
                frontViewImage: null,
                equipmentImage: asset('failed'),
                equipmentInformation: null,
            },
        });
        expect(statusOf(rows, 'name')?.status).toBe('missing');
        expect(statusOf(rows, 'startWeather')?.status).toBe('incomplete');
        expect(statusOf(rows, 'frontView')?.status).toBe('missing');
        expect(statusOf(rows, 'equipmentPhoto')?.status).toBe('incomplete');
        expect(statusOf(rows, 'equipmentDetails')?.status).toBe('missing');
        expect(statusOf(rows, 'endWeather')?.status).toBe('missing');
    });

    it('returns nothing for an unknown surveyor', () => {
        expect(getSurveyorRows(buildContext(), 'missing')).toEqual([]);
    });
});

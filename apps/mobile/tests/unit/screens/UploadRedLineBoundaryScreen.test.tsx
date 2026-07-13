jest.mock('@react-navigation/native', () =>
    require('../../helpers/reactNavigationMock'),
);

jest.mock('expo-file-system', () => ({
    readAsStringAsync: jest.fn(),
    EncodingType: { Base64: 'base64' },
}));

jest.mock('@components/DocumentUpload', () => {
    const React = require('react');
    const { Text } = require('react-native');
    return {
        DocumentUpload: ({ onChange, value }: { onChange: (uri: string) => void; value?: string }) =>
            React.createElement(
                Text,
                { onPress: () => onChange('file:///tmp/photo.jpg') },
                value ?? 'pick-document',
            ),
    };
});

import * as FileSystem from 'expo-file-system';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { UploadRedLineBoundaryScreen } from '@screens/Admin/UploadRedLineBoundaryScreen';
import { createMockService, renderWithService } from '../../helpers/testUtils';
import {
    mockNavigate,
    resetNavigationMock,
    setRouteParams,
} from '../../helpers/reactNavigationMock';

const readAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;

beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1' });
    readAsStringAsync.mockReset();
    readAsStringAsync.mockResolvedValue('AAAA');
});

describe('UploadRedLineBoundaryScreen', () => {
    it('skips the upload and advances to add surveyors', async () => {
        renderWithService(<UploadRedLineBoundaryScreen />, createMockService());
        fireEvent.press(screen.getByText('Skip'));
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('AddSurveyorScreen', {
                surveyId: 'survey-1',
            }),
        );
    });

    it('uploads the selected boundary image and advances', async () => {
        const service = createMockService();
        renderWithService(<UploadRedLineBoundaryScreen />, service);
        fireEvent.press(screen.getByText('pick-document'));
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(service.setBoundaryImage).toHaveBeenCalledWith(
                'survey-1',
                'photo.jpg',
                expect.any(Uint8Array),
            ),
        );
        expect(readAsStringAsync).toHaveBeenCalledWith('file:///tmp/photo.jpg', {
            encoding: 'base64',
        });
        expect(mockNavigate).toHaveBeenCalledWith('AddSurveyorScreen', {
            surveyId: 'survey-1',
        });
    });

    it('does not navigate when the upload fails', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const service = createMockService({
            setBoundaryImage: jest.fn().mockRejectedValue(new Error('upload failed')),
        });
        renderWithService(<UploadRedLineBoundaryScreen />, service);
        fireEvent.press(screen.getByText('pick-document'));
        fireEvent.press(screen.getByText('Continue'));
        await waitFor(() =>
            expect(logSpy).toHaveBeenCalledWith(
                'Error uploading red line boundary: ',
                expect.any(Error),
            ),
        );
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});

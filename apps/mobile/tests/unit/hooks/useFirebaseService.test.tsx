jest.mock('@services/firebaseSurveyService', () => ({
    isFirebaseEnabled: jest.fn(),
    createFirebaseSurveyService: jest.fn(),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useFirebaseService } from '../../../src/hooks/useFirebaseService';
import {
    isFirebaseEnabled,
    createFirebaseSurveyService,
} from '@services/firebaseSurveyService';

const mockIsEnabled = isFirebaseEnabled as jest.Mock;
const mockCreate = createFirebaseSurveyService as jest.Mock;

const fakeService = {} as Awaited<ReturnType<typeof createFirebaseSurveyService>>;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('useFirebaseService', () => {
    it('is immediately ready with no service when Firebase is disabled', () => {
        mockIsEnabled.mockReturnValue(false);
        const { result } = renderHook(() => useFirebaseService());
        expect(result.current.ready).toBe(true);
        expect(result.current.service).toBeNull();
        expect(result.current.failed).toBe(false);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('provides the Firebase service once init resolves', async () => {
        mockIsEnabled.mockReturnValue(true);
        mockCreate.mockResolvedValue(fakeService);
        const { result } = renderHook(() => useFirebaseService());

        await waitFor(() => expect(result.current.ready).toBe(true));
        expect(result.current.service).toBe(fakeService);
        expect(result.current.failed).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('marks failed (but ready) when init rejects', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        mockIsEnabled.mockReturnValue(true);
        mockCreate.mockRejectedValue(new Error('no network'));
        const { result } = renderHook(() => useFirebaseService());

        await waitFor(() => expect(result.current.ready).toBe(true));
        expect(result.current.failed).toBe(true);
        expect(result.current.error?.message).toBe('no network');
        expect(result.current.service).toBeNull();
        errorSpy.mockRestore();
    });

    it('recovers on retry after an initial failure', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        mockIsEnabled.mockReturnValue(true);
        mockCreate
            .mockRejectedValueOnce(new Error('no network'))
            .mockResolvedValueOnce(fakeService);
        const { result } = renderHook(() => useFirebaseService());

        await waitFor(() => expect(result.current.failed).toBe(true));

        act(() => result.current.retry());

        await waitFor(() => expect(result.current.service).toBe(fakeService));
        expect(result.current.failed).toBe(false);
        expect(result.current.error).toBeNull();
        errorSpy.mockRestore();
    });
});

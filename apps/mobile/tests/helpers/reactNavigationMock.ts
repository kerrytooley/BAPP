export const mockNavigate = jest.fn();
export const mockGoBack = jest.fn();
export const mockPush = jest.fn();
export const mockAddListener = jest.fn(
    (_event: string, _callback: () => void): (() => void) => jest.fn(),
);

const routeState: { params: Record<string, unknown> } = { params: {} };

export const useNavigation = () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    push: mockPush,
    addListener: mockAddListener,
});

export const useRoute = () => ({ params: routeState.params });

export const setRouteParams = (params: Record<string, unknown>) => {
    routeState.params = params;
};

export const resetNavigationMock = () => {
    mockNavigate.mockReset();
    mockGoBack.mockReset();
    mockPush.mockReset();
    mockAddListener.mockReset();
    mockAddListener.mockImplementation(() => jest.fn());
    routeState.params = {};
};

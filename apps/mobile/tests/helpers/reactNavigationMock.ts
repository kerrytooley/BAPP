export const mockNavigate = jest.fn();
export const mockGoBack = jest.fn();
export const mockPush = jest.fn();

const routeState: { params: Record<string, unknown> } = { params: {} };

export const useNavigation = () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    push: mockPush,
});

export const useRoute = () => ({ params: routeState.params });

export const setRouteParams = (params: Record<string, unknown>) => {
    routeState.params = params;
};

export const resetNavigationMock = () => {
    mockNavigate.mockReset();
    mockGoBack.mockReset();
    mockPush.mockReset();
    routeState.params = {};
};

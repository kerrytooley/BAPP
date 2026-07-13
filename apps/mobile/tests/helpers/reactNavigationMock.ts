export const mockNavigate = jest.fn();
export const mockGoBack = jest.fn();

const routeState: { params: Record<string, unknown> } = { params: {} };

export const useNavigation = () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
});

export const useRoute = () => ({ params: routeState.params });

export const setRouteParams = (params: Record<string, unknown>) => {
    routeState.params = params;
};

export const resetNavigationMock = () => {
    mockNavigate.mockReset();
    mockGoBack.mockReset();
    routeState.params = {};
};

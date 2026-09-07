jest.mock('@react-navigation/native', () =>
  require('../../helpers/reactNavigationMock'),
);

import { loadFeature, defineFeature } from 'jest-cucumber';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AddSurveyorScreen } from '@screens/Admin/AddSurveyorScreen';
import {
  createMockService,
  renderWithActiveSurvey,
  createContextSubscription,
  mockSubscribeContext,
  type MockSurveyService,
  type ControllableSubscription,
} from '../../helpers/testUtils';
import { buildSurveyor, buildContext } from '../../helpers/factories';
import {
  resetNavigationMock,
  setRouteParams,
} from '../../helpers/reactNavigationMock';

const feature = loadFeature('./tests/features/integration/manage-surveyors.feature');

defineFeature(feature, (test) => {
  let service: MockSurveyService;
  let subscription: ControllableSubscription;
  const lead = buildSurveyor({ id: 'lead-1', name: 'Alice', isLead: true });
  const extra = buildSurveyor({ id: 'extra-1', name: 'Bob', isLead: false });

  beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1' });
    service = createMockService();
    service.getBoundaryImage.mockResolvedValue({ status: 'none' });
  });

  test('Admin adds another surveyor', ({ given, when, then }) => {
    given('the add surveyors screen is open with a lead surveyor', async () => {
      subscription = createContextSubscription(
        buildContext({ surveyors: [lead], locations: [] }),
      );
      service.subscribeSurveyContext = subscription.subscribe;
      service.addSurveyor.mockResolvedValue(extra);
      renderWithActiveSurvey(<AddSurveyorScreen />, service, 'survey-1');
      await waitFor(() => screen.getByText('Add Lead Surveyor'));
    });

    when('the admin adds another surveyor', async () => {
      fireEvent.press(screen.getByText('Add More Surveyors'));
      await waitFor(() => expect(service.addSurveyor).toHaveBeenCalled());
      // The live subscription re-emits with the new surveyor once the write lands.
      subscription.emit(buildContext({ surveyors: [lead, extra], locations: [] }));
      await waitFor(() => screen.getByText('Add Surveyor'));
    });

    then('two surveyor cards are shown', () => {
      expect(screen.getByText('Add Lead Surveyor')).toBeOnTheScreen();
      expect(screen.getByText('Add Surveyor')).toBeOnTheScreen();
    });
  });

  test('Admin removes an additional surveyor', ({ given, when, then }) => {
    given('the add surveyors screen is open with a lead and an extra surveyor', async () => {
      service.subscribeSurveyContext = mockSubscribeContext(
        buildContext({ surveyors: [lead, extra], locations: [] }),
      );
      renderWithActiveSurvey(<AddSurveyorScreen />, service, 'survey-1');
      await waitFor(() => screen.getByText('Add Surveyor'));
    });

    when('the admin removes the extra surveyor', () => {
      fireEvent.press(screen.getByLabelText('Remove Add Surveyor'));
    });

    then('the extra surveyor is removed from the survey', async () => {
      await waitFor(() =>
        expect(service.removeSurveyor).toHaveBeenCalledWith('extra-1'),
      );
    });
  });
});

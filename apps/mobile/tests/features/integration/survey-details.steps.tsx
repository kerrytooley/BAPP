jest.mock('@react-navigation/native', () =>
  require('../../helpers/reactNavigationMock'),
);

import { loadFeature, defineFeature } from 'jest-cucumber';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { CreateSurvey } from '@screens/Admin/CreateSurvey';
import {
  createMockService,
  renderWithActiveSurvey,
  type MockSurveyService,
} from '../../helpers/testUtils';
import {
  mockNavigate,
  resetNavigationMock,
  setRouteParams,
} from '../../helpers/reactNavigationMock';

const feature = loadFeature('./tests/features/integration/survey-details.feature');

defineFeature(feature, (test) => {
  let service: MockSurveyService;

  beforeEach(() => {
    resetNavigationMock();
    setRouteParams({ surveyId: 'survey-1' });
    service = createMockService();
  });

  const openCreateSurvey = (given: (text: string, fn: () => void) => void) => {
    given('the create survey screen is open', () => {
      renderWithActiveSurvey(<CreateSurvey />, service, undefined);
    });
  };

  test('Admin provides a name and postcode', ({ given, when, and, then }) => {
    openCreateSurvey(given);

    when(/^the admin enters the survey name "(.*)"$/, (name: string) => {
      fireEvent.changeText(
        screen.getByPlaceholderText('Input survey name'),
        name,
      );
    });

    and(/^the admin enters the postcode "(.*)"$/, (postcode: string) => {
      fireEvent.changeText(
        screen.getByPlaceholderText('Input survey postcode'),
        postcode,
      );
    });

    and('the admin continues', () => {
      fireEvent.press(screen.getByText('Continue'));
    });

    then(
      /^the survey details are saved with name "(.*)" and postcode "(.*)"$/,
      async (name: string, postcode: string) => {
        await waitFor(() =>
          expect(service.updateSurvey).toHaveBeenCalledWith(
            'survey-1',
            expect.objectContaining({ name, postcode }),
          ),
        );
      },
    );

    and('the admin is taken to save their admin code', () => {
      expect(mockNavigate).toHaveBeenCalledWith('SaveAdminCodeScreen', {
        surveyId: 'survey-1',
      });
    });
  });

  test('Admin is blocked by a failing save', ({ given, and, when, then }) => {
    openCreateSurvey(given);

    and('saving the survey will fail', () => {
      service.updateSurvey.mockRejectedValue(new Error('save failed'));
      jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    when(/^the admin enters the survey name "(.*)"$/, (name: string) => {
      fireEvent.changeText(screen.getByPlaceholderText('Input survey name'), name);
    });

    and('the admin continues', () => {
      fireEvent.press(screen.getByText('Continue'));
    });

    then('the admin stays on the create survey screen', async () => {
      await waitFor(() => expect(service.updateSurvey).toHaveBeenCalled());
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('Admin cannot continue without a survey name', ({ given, when, and, then }) => {
    openCreateSurvey(given);

    when(/^the admin enters the postcode "(.*)"$/, (postcode: string) => {
      fireEvent.changeText(screen.getByPlaceholderText('Input survey postcode'), postcode);
    });

    and('the admin continues', () => {
      fireEvent.press(screen.getByText('Continue'));
    });

    then('nothing is saved and the admin stays on the create survey screen', () => {
      expect(service.createSurvey).not.toHaveBeenCalled();
      expect(service.updateSurvey).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});

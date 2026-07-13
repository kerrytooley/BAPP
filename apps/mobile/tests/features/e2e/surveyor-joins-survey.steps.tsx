import { loadFeature, defineFeature } from 'jest-cucumber';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { createRealService, renderApp } from '../../helpers/e2eApp';
import type { SurveyService } from '@bapp/domain';

const feature = loadFeature('./tests/features/e2e/surveyor-joins-survey.feature');

defineFeature(feature, (test) => {
  let service: SurveyService;
  let code: string;

  beforeEach(() => {
    service = createRealService();
  });

  test('Surveyor joins an existing survey with a valid code', ({
    given,
    and,
    when,
    then,
  }) => {
    given(
      /^an existing survey named "(.*)" with postcode "(.*)"$/,
      async (name: string, postcode: string) => {
        const survey = await service.createSurvey();
        await service.updateSurvey(survey.id, { name, postcode });
        code = survey.surveyorCode;
      },
    );

    and('the app is open on the welcome screen', () => {
      renderApp(service);
      expect(screen.getByText('Join as Surveyor')).toBeOnTheScreen();
    });

    when('the surveyor chooses to join as a surveyor', async () => {
      fireEvent.press(screen.getByText('Join as Surveyor'));
      await waitFor(() =>
        expect(screen.getByText('Input Survey Code')).toBeOnTheScreen(),
      );
    });

    and('enters the shared survey code', async () => {
      fireEvent.changeText(screen.getByPlaceholderText('XXXXXX'), code);
      fireEvent.press(screen.getByText('Continue'));
      await waitFor(() =>
        expect(screen.getByText('You are joining:')).toBeOnTheScreen(),
      );
    });

    then('the survey details are shown for confirmation', () => {
      expect(screen.getByText('Dusk count - SW1A 1AA')).toBeOnTheScreen();
    });
  });
});

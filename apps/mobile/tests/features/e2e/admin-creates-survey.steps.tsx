import { loadFeature, defineFeature } from 'jest-cucumber';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { createRealService, renderApp } from '../../helpers/e2eApp';
import type { SurveyService } from '@bapp/domain';

const feature = loadFeature('./tests/features/e2e/admin-creates-survey.feature');

const pressLast = (label: string) =>
  fireEvent.press(screen.getAllByText(label).at(-1)!);

const waitForScreen = (title: string) =>
  waitFor(() => expect(screen.getByText(title)).toBeOnTheScreen());

defineFeature(feature, (test) => {
  let service: SurveyService;

  beforeEach(() => {
    service = createRealService();
  });

  test('Admin completes the full survey setup flow', ({ given, when, and, then }) => {
    given('the app is open on the welcome screen', () => {
      renderApp(service);
      expect(screen.getByText('Join as Survey Admin')).toBeOnTheScreen();
    });

    when('the admin chooses to join as a survey admin', async () => {
      fireEvent.press(screen.getByText('Join as Survey Admin'));
      await waitForScreen('Begin a new survey');
    });

    and('begins a new survey', async () => {
      fireEvent.press(screen.getByText('Begin a new survey'));
      await waitForScreen('Enter Email Address');
    });

    and(/^provides the admin email "(.*)"$/, async (email: string) => {
      fireEvent.changeText(
        screen.getByPlaceholderText('Input email address'),
        email,
      );
      pressLast('Continue');
      await waitForScreen('Create Survey');
    });

    and(
      /^enters the survey name "(.*)" and postcode "(.*)"$/,
      async (name: string, postcode: string) => {
        fireEvent.changeText(
          screen.getByPlaceholderText('Input survey name'),
          name,
        );
        fireEvent.changeText(
          screen.getByPlaceholderText('Input survey postcode'),
          postcode,
        );
        pressLast('Continue');
        await waitForScreen('Upload Red Line Boundary');
      },
    );

    and('skips the red line boundary upload', async () => {
      fireEvent.press(screen.getByText('Skip'));
      await waitForScreen('Add Surveyors');
    });

    and(/^names the lead surveyor "(.*)"$/, async (name: string) => {
      await waitFor(() =>
        expect(
          screen.getByPlaceholderText('Input Surveyor Name'),
        ).toBeOnTheScreen(),
      );
      fireEvent.changeText(
        screen.getByPlaceholderText('Input Surveyor Name'),
        name,
      );
    });

    and('completes the survey setup', async () => {
      pressLast('Continue');
      await waitForScreen('Review Survey Details');
      fireEvent.press(screen.getByText('Complete Survey Setup'));
      await waitForScreen('Share Your Survey Code');
    });

    then('a shareable survey code is displayed', async () => {
      await waitFor(() =>
        expect(screen.getByText(/^[a-z0-9]{6}$/)).toBeOnTheScreen(),
      );
    });
  });
});

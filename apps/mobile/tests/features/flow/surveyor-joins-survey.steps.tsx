import { loadFeature, defineFeature } from 'jest-cucumber';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { createRealService, renderApp } from '../../helpers/flowApp';
import type { SurveyService } from '@bapp/domain';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true }),
  ),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    }),
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true }),
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: 'file://photo.jpg' }],
    }),
  ),
}));

jest.mock('@utils/image', () => ({
  getAspectRatio: jest.fn(() => Promise.resolve(1.5)),
  createImageBody: jest.fn(() =>
    Promise.resolve({ fileName: 'photo.jpg', bytes: new Uint8Array([1, 2, 3]) }),
  ),
}));

const feature = loadFeature('./tests/features/flow/surveyor-joins-survey.feature');

// Native-stack keeps previously-visited screens mounted, so a label like
// "Continue" can resolve to a button on an earlier screen. Press the last
// (top-most) match, mirroring the admin-flow steps.
const pressLast = (label: string) =>
  fireEvent.press(screen.getAllByText(label).at(-1)!);

const waitForScreen = (title: string) =>
  waitFor(() => expect(screen.getByText(title)).toBeOnTheScreen());

defineFeature(feature, (test) => {
  let service: SurveyService;
  let code: string;
  let surveyId: string;

  beforeEach(() => {
    service = createRealService();
  });

  const seedSurvey = async (name: string, postcode: string, lead: string) => {
    const survey = await service.createSurvey();
    await service.updateSurvey(survey.id, { name, postcode });
    await service.addSurveyor(survey.id, { name: lead, isLead: true });
    surveyId = survey.id;
    code = survey.surveyorCode;
  };

  test('Surveyor joins an existing survey with a valid code', ({
    given,
    and,
    when,
    then,
  }) => {
    given(
      /^an existing survey named "(.*)" with postcode "(.*)" and lead surveyor "(.*)"$/,
      async (name: string, postcode: string, lead: string) => {
        await seedSurvey(name, postcode, lead);
      },
    );

    and('the app is open on the welcome screen', () => {
      renderApp(service);
      expect(screen.getByText('Join as Surveyor')).toBeOnTheScreen();
    });

    when('the surveyor chooses to join as a surveyor', async () => {
      fireEvent.press(screen.getByText('Join as Surveyor'));
      await waitForScreen('Input Survey Code');
    });

    and('enters the shared survey code', async () => {
      fireEvent.changeText(screen.getByPlaceholderText('XXXXXX'), code);
      fireEvent.press(screen.getByText('Continue'));
      await waitForScreen('You are joining:');
    });

    then('the survey details are shown for confirmation', () => {
      expect(screen.getByText('Dusk count - SW1A 1AA')).toBeOnTheScreen();
    });
  });

  test('Surveyor completes the join flow and records an observation', ({
    given,
    and,
    when,
    then,
  }) => {
    given(
      /^an existing survey named "(.*)" with postcode "(.*)" and lead surveyor "(.*)"$/,
      async (name: string, postcode: string, lead: string) => {
        await seedSurvey(name, postcode, lead);
      },
    );

    and('the app is open on the welcome screen', () => {
      renderApp(service);
      expect(screen.getByText('Join as Surveyor')).toBeOnTheScreen();
    });

    when('the surveyor chooses to join as a surveyor', async () => {
      fireEvent.press(screen.getByText('Join as Surveyor'));
      await waitForScreen('Input Survey Code');
    });

    and('enters the shared survey code', async () => {
      fireEvent.changeText(screen.getByPlaceholderText('XXXXXX'), code);
      fireEvent.press(screen.getByText('Continue'));
      await waitForScreen('You are joining:');
    });

    and('confirms the survey they are joining', async () => {
      // Wait for the survey to load so the confirmation shows real details.
      await waitForScreen('Dusk count - SW1A 1AA');
      pressLast('Continue');
      await waitForScreen('Select Surveyor');
    });

    and(/^selects the lead surveyor "(.*)"$/, async (lead: string) => {
      const leadLabel = `Lead Surveyor: ${lead}`;
      await waitForScreen(leadLabel);
      fireEvent.press(screen.getByText(leadLabel));
      await waitForScreen('Confirm Surveyor Details');
    });

    and('confirms the surveyor details', async () => {
      // The Continue destination depends on the loaded surveyor (lead -> weather),
      // so wait until the surveyor's details have populated before continuing.
      await waitForScreen('Alice');
      pressLast('Continue');
      await waitForScreen('Start Weather Conditions');
    });

    and('enters the start weather conditions', async () => {
      fireEvent.changeText(
        screen.getByPlaceholderText('Input Temperature'),
        '18',
      );
      fireEvent.press(screen.getByText('Wet'));
      pressLast('Continue');
      await waitForScreen('Confirm Location');
    });

    and('confirms their location on the map', async () => {
      pressLast('Continue');
      await waitForScreen('Front View of Property');
    });

    and('captures the front and equipment setup photos', async () => {
      // Front view: take the photo, then save to advance to the equipment step.
      pressLast('Take Photo');
      await waitFor(() =>
        expect(screen.getByText('Save photo and continue')).toBeOnTheScreen(),
      );
      pressLast('Save photo and continue');
      await waitForScreen('Equipment Setup');

      // Equipment view: take the photo, then save to complete setup.
      pressLast('Take Photo');
      await waitFor(() =>
        expect(
          screen.getAllByText('Save photo and continue').at(-1),
        ).toBeOnTheScreen(),
      );
      pressLast('Save photo and continue');
      await waitForScreen('Survey Setup Complete!');

      pressLast('Next');
      await waitForScreen('Add New Bat Type');
    });

    and(/^records a "(.*)" observation$/, async (species: string) => {
      fireEvent.press(screen.getByLabelText(species));
    });

    then('the observation is saved against the survey', async () => {
      await waitFor(async () => {
        const context = await service.getSurveyContext(surveyId);
        expect(context.observations).toHaveLength(1);
        expect(context.observations[0].species).toBe('noctule');
      });
    });
  });
});

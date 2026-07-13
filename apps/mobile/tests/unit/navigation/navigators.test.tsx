import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { RootNavigator } from '@navigators/index';
import { AdminNavigator } from '@navigators/AdminNavigator';
import { SurveyorNavigator } from '@navigators/SurveyorNavigator';
import { SurveyServiceProvider } from '@services/surveyServiceContext';
import type { SurveyService } from '@bapp/domain';
import { createMockService } from '../../helpers/testUtils';

const renderNav = (ui: ReactElement) =>
    render(
        <SurveyServiceProvider value={createMockService() as unknown as SurveyService}>
            <NavigationContainer>{ui}</NavigationContainer>
        </SurveyServiceProvider>,
    );

describe('navigators', () => {
    it('shows the welcome screen as the root route', async () => {
        renderNav(<RootNavigator />);
        expect(await screen.findByText('Join as Survey Admin')).toBeOnTheScreen();
    });

    it('starts the admin flow on the begin-or-continue screen', async () => {
        renderNav(<AdminNavigator />);
        expect(await screen.findByText('Begin a new survey')).toBeOnTheScreen();
    });

    it('starts the surveyor flow on the input-code screen', async () => {
        renderNav(<SurveyorNavigator />);
        expect(await screen.findByPlaceholderText('XXXXXX')).toBeOnTheScreen();
    });
});

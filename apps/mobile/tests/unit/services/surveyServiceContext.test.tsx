import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { SurveyService } from '@bapp/domain';
import {
    SurveyServiceProvider,
    useSurveyService,
} from '@services/surveyServiceContext';
import { createMockService } from '../../helpers/testUtils';

function ServiceProbe() {
    const service = useSurveyService();
    return <Text>{typeof service.createSurvey === 'function' ? 'ready' : 'missing'}</Text>;
}

describe('surveyServiceContext', () => {
    it('provides the supplied service to consumers', () => {
        const service = createMockService();
        render(
            <SurveyServiceProvider value={service as unknown as SurveyService}>
                <ServiceProbe />
            </SurveyServiceProvider>,
        );
        expect(screen.getByText('ready')).toBeOnTheScreen();
    });

    it('falls back to the default service when no provider is present', () => {
        render(<ServiceProbe />);
        expect(screen.getByText('ready')).toBeOnTheScreen();
    });
});

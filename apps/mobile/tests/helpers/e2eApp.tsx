import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { NoOpValidator, SurveyService } from '@bapp/domain';
import {
    InMemorySurveyRepository,
    InMemoryMediaRepository,
    InMemoryObservationRepository,
    InMemoryLocationRepository,
    InMemorySurveyorRepository,
} from '@bapp/repository';
import { SurveyServiceProvider } from '@services/surveyServiceContext';
import { RootNavigator } from '@navigators/index';

export function createRealService(): SurveyService {
    const locationRepo = new InMemoryLocationRepository();
    const surveyorRepo = new InMemorySurveyorRepository();
    const observationRepo = new InMemoryObservationRepository();
    const mediaRepo = new InMemoryMediaRepository();
    const surveyRepo = new InMemorySurveyRepository(
        locationRepo,
        surveyorRepo,
        observationRepo,
    );

    return new SurveyService(
        surveyRepo,
        locationRepo,
        surveyorRepo,
        observationRepo,
        mediaRepo,
        new NoOpValidator(),
    );
}

export function renderApp(service: SurveyService) {
    return render(
        <SurveyServiceProvider value={service}>
            <NavigationContainer>
                <RootNavigator />
            </NavigationContainer>
        </SurveyServiceProvider>,
    );
}

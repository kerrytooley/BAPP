import { FieldValidator, SurveyService } from '@bapp/domain';
import {
    InMemorySurveyRepository,
    InMemoryMediaRepository,
    InMemoryObservationRepository,
    InMemoryLocationRepository,
    InMemorySurveyorRepository
} from '@bapp/repository';
import { createContext, useContext } from 'react';

/** Build the in-memory backend (default; used by tests and when Firebase is off). */
export function createInMemorySurveyService(): SurveyService {
    const locationRepo = new InMemoryLocationRepository();
    const surveyorRepo = new InMemorySurveyorRepository();
    const observationRepo = new InMemoryObservationRepository();
    const mediaRepo = new InMemoryMediaRepository();
    const surveyRepo = new InMemorySurveyRepository(locationRepo, surveyorRepo, observationRepo);

    return new SurveyService(
        surveyRepo,
        locationRepo,
        surveyorRepo,
        observationRepo,
        mediaRepo,
        new FieldValidator()
    );
}

const service = createInMemorySurveyService();

const SurveyServiceContext = createContext(service);
export const SurveyServiceProvider = SurveyServiceContext.Provider;
export const useSurveyService = () => useContext(SurveyServiceContext);

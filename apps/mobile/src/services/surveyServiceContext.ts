import { NoOpValidator, SurveyService } from '@bapp/domain';
import {
    InMemorySurveyRepository,
    InMemoryMediaRepository,
    InMemoryObservationRepository,
    InMemoryLocationRepository,
    InMemorySurveyorRepository
} from '@bapp/repository';
import { createContext, useContext } from 'react';

const locationRepo = new InMemoryLocationRepository();
const surveyorRepo = new InMemorySurveyorRepository();
const observationRepo = new InMemoryObservationRepository();
const mediaRepo = new InMemoryMediaRepository();
const surveyRepo = new InMemorySurveyRepository(locationRepo, surveyorRepo, observationRepo);

const service = new SurveyService(
    surveyRepo,
    locationRepo,
    surveyorRepo,
    observationRepo,
    mediaRepo,
    new NoOpValidator()
);

const SurveyServiceContext = createContext(service);
export const SurveyServiceProvider = SurveyServiceContext.Provider;
export const useSurveyService = () => useContext(SurveyServiceContext);
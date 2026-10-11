import type { SurveyContext } from "@bapp/domain";
import type { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { getSurveyorRows } from "@utils/surveyStatus";

export type StepRoute = {
    [K in keyof SurveyorStackParamList]: { name: K; params: SurveyorStackParamList[K] }
}["WeatherConditionsScreen" | "SurveyorConfirmLocationScreen" | "CapturePhotoScreen" | "EquipmentDetailsScreen"];

/** Setup steps in flow order; keys match the surveyor status rows. */
export const SETUP_STEP_KEYS = ["startWeather", "location", "frontView", "equipmentPhoto", "equipmentDetails"] as const;
export type SetupStepKey = typeof SETUP_STEP_KEYS[number];

const STEP_LABELS: Record<SetupStepKey, string> = {
    startWeather: "Start weather conditions",
    location: "Survey location",
    frontView: "Front view photo",
    equipmentPhoto: "Equipment photo",
    equipmentDetails: "Equipment details",
};

export interface SetupStep {
    key: SetupStepKey;
    label: string;
    route: StepRoute;
}

const isStepKey = (key: string): key is SetupStepKey => (SETUP_STEP_KEYS as readonly string[]).includes(key);

/** Setup steps whose status is missing or incomplete, in flow order. Each route opens in resume mode. */
export function getIncompleteSetupSteps(context: SurveyContext, surveyorId: string): SetupStep[] {
    const surveyor = context.surveyors.find((s) => s.id === surveyorId);
    const location = context.locations.find((l) => l.id === surveyor?.locationId);
    if (!surveyor || !location) return [];

    const surveyId = context.survey.id;
    const locationId = location.id;
    const mode = "resume" as const;
    const routes: Record<SetupStepKey, StepRoute> = {
        startWeather: { name: "WeatherConditionsScreen", params: { surveyId, surveyorId, locationId, type: "start", mode } },
        location: { name: "SurveyorConfirmLocationScreen", params: { surveyId, surveyorId, mode } },
        frontView: { name: "CapturePhotoScreen", params: { surveyId, locationId, surveyorId, photoType: "frontView", mode } },
        equipmentPhoto: { name: "CapturePhotoScreen", params: { surveyId, locationId, surveyorId, photoType: "equipment", mode } },
        equipmentDetails: { name: "EquipmentDetailsScreen", params: { surveyId, locationId, surveyorId, mode } },
    };

    const unfinished = new Set(
        getSurveyorRows(context, surveyorId)
            .filter((row) => isStepKey(row.key) && row.status !== "complete")
            .map((row) => row.key as SetupStepKey),
    );
    return SETUP_STEP_KEYS
        .filter((key) => unfinished.has(key))
        .map((key) => ({ key, label: STEP_LABELS[key], route: routes[key] }));
}

/** The next unfinished step after `current` in flow order, if any. */
export function nextSetupStep(context: SurveyContext, surveyorId: string, current: SetupStepKey): SetupStep | undefined {
    const after = SETUP_STEP_KEYS.indexOf(current);
    return getIncompleteSetupSteps(context, surveyorId).find((step) => SETUP_STEP_KEYS.indexOf(step.key) > after);
}

import { isBlank, type SurveyContext } from "@bapp/domain";
import type { SurveyorStackParamList } from "@navigators/SurveyorNavigator";

type StepRoute = {
    [K in keyof SurveyorStackParamList]: { name: K; params: SurveyorStackParamList[K] }
}["WeatherConditionsScreen" | "SurveyorConfirmLocationScreen" | "CapturePhotoScreen" | "EquipmentDetailsScreen"];

export interface SetupStep {
    label: string;
    route: StepRoute;
}

/** Setup steps the surveyor skipped or left unfinished, in flow order. */
export function getIncompleteSetupSteps(context: SurveyContext, surveyorId: string): SetupStep[] {
    const surveyor = context.surveyors.find((s) => s.id === surveyorId);
    const location = context.locations.find((l) => l.id === surveyor?.locationId);
    if (!surveyor || !location) return [];

    const surveyId = context.survey.id;
    const locationId = location.id;
    const steps: SetupStep[] = [];
    const allBlank = (values: object | null | undefined) =>
        !values || Object.values(values).every((v) => isBlank(v as string | null));

    if (surveyor.isLead && allBlank(context.survey.startWeather)) {
        steps.push({
            label: "Start weather conditions",
            route: { name: "WeatherConditionsScreen", params: { surveyId, surveyorId, locationId, type: "start" } },
        });
    }
    // Without a red line boundary there is no pin to place, so the location step can't be incomplete.
    if (context.survey.boundary && !location.boundaryPosition) {
        steps.push({
            label: "Survey location",
            route: { name: "SurveyorConfirmLocationScreen", params: { surveyId, surveyorId } },
        });
    }
    if (!location.frontViewImage) {
        steps.push({
            label: "Front view photo",
            route: { name: "CapturePhotoScreen", params: { surveyId, locationId, surveyorId, photoType: "frontView" } },
        });
    }
    if (!location.equipmentImage) {
        steps.push({
            label: "Equipment photo",
            route: { name: "CapturePhotoScreen", params: { surveyId, locationId, surveyorId, photoType: "equipment" } },
        });
    }
    if (allBlank(location.equipmentInformation)) {
        steps.push({
            label: "Equipment details",
            route: { name: "EquipmentDetailsScreen", params: { surveyId, locationId, surveyorId } },
        });
    }
    return steps;
}

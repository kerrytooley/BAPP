import type { SurveyContext, Surveyor } from "@bapp/domain";
import type { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { getIncompleteSetupSteps } from "@utils/setupProgress";

type RouteFor<K extends keyof SurveyorStackParamList> = { name: K; params: SurveyorStackParamList[K] };

export type SurveyorRoute =
    | RouteFor<"SurveyorCompleteScreen">
    | RouteFor<"SetupIncompleteScreen">
    | RouteFor<"SurveyScreen">
    | RouteFor<"CapturePhotoScreen">
    | RouteFor<"ConfirmSurveyorDetailsScreen">;

export function routeForSurveyor(context: SurveyContext, surveyor: Surveyor): SurveyorRoute {
    const surveyId = context.survey.id;
    const surveyorId = surveyor.id;

    if (surveyor.status === "done") {
        return { name: "SurveyorCompleteScreen", params: { surveyId, surveyorId, locationId: surveyor.locationId ?? "" } };
    }
    if (surveyor.status === "ready" && surveyor.locationId) {
        const params = { surveyId, surveyorId, locationId: surveyor.locationId };
        return getIncompleteSetupSteps(context, surveyorId).length > 0
            ? { name: "SetupIncompleteScreen", params }
            : { name: "SurveyScreen", params };
    }
    if (surveyor.status === "confirmed" && surveyor.locationId) {
        return {
            name: "CapturePhotoScreen",
            params: { surveyId, surveyorId, locationId: surveyor.locationId, photoType: "frontView" },
        };
    }
    return { name: "ConfirmSurveyorDetailsScreen", params: { surveyId, surveyorId } };
}

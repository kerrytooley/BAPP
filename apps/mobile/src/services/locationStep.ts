import type { SurveyService } from "@bapp/domain";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SurveyorStackParamList } from "@navigators/SurveyorNavigator";

export type LocationStepService = Pick<SurveyService, "getSurveyContext" | "addLocation" | "updateSurveyor">;

/**
 * Go to the confirm-location step, or skip straight to photos when the surveyor
 * has no location to confirm (e.g. no red line boundary was uploaded). Photos and
 * observations still need a location, so a placeholder one is created first.
 */
export async function goToLocationStep(
    service: LocationStepService,
    navigation: NativeStackNavigationProp<SurveyorStackParamList>,
    surveyId: string,
    surveyorId: string,
): Promise<void> {
    const { surveyors } = await service.getSurveyContext(surveyId);
    const surveyor = surveyors.find((s) => s.id === surveyorId);

    if (surveyor?.locationId) {
        navigation.navigate("SurveyorConfirmLocationScreen", { surveyId, surveyorId });
        return;
    }

    const location = await service.addLocation(surveyId, {});
    await service.updateSurveyor(surveyorId, {
        locationId: location.id,
        ...(surveyor?.status === "pending" ? { status: "confirmed" as const } : {}),
    });
    navigation.navigate("CapturePhotoScreen", { surveyId, locationId: location.id, surveyorId, photoType: "frontView" });
}

import type { SurveyService } from "@bapp/domain";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { nextSetupStep, type SetupStep, type SetupStepKey, type StepRoute } from "@utils/setupProgress";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function openSetupStep(navigation: Nav, step: SetupStep): void {
    const push = navigation.push as unknown as (name: StepRoute["name"], params: StepRoute["params"]) => void;
    push(step.route.name, step.route.params);
}

/** After a resumed step, open the next unfinished one, or return to the survey once setup is done. */
export async function continueResumedSetup(
    service: Pick<SurveyService, "getSurveyContext">,
    navigation: Nav,
    surveyId: string,
    surveyorId: string,
    current: SetupStepKey,
): Promise<void> {
    const context = await service.getSurveyContext(surveyId);
    const next = nextSetupStep(context, surveyorId, current);
    if (next) {
        openSetupStep(navigation, next);
        return;
    }
    const locationId = context.surveyors.find((s) => s.id === surveyorId)?.locationId ?? "";
    navigation.navigate("SurveyScreen", { surveyId, surveyorId, locationId });
}

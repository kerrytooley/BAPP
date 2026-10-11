import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { BeginOrContinueSurveyScreen } from "@screens/Admin/BeginOrContinueSurveyScreen";
import { CreateSurvey } from "@screens/Admin/CreateSurvey";
import { UploadRedLineBoundaryScreen } from "@screens/Admin/UploadRedLineBoundaryScreen"
import { AddSurveyorScreen } from "@screens/Admin/AddSurveyorScreen";
import { ReviewSurveyDetailsScreen } from "@screens/Admin/ReviewSurveyDetailsScreen";
import { ShareCodeScreen } from "@screens/Admin/ShareCodeScreen";
import { AdminCodeScreen } from "@screens/Admin/AdminCodeScreen";
import { SurveyStatusScreen } from "@screens/Admin/SurveyStatusScreen";
import { SaveAdminCodeScreen } from "@screens/Admin/SaveAdminCodeScreen";
import { WelcomeWalkthroughScreen } from "@screens/Admin/WelcomeWalkthroughScreen";
import { SurveySummaryScreen } from "@screens/Surveyor/SurveySummaryScreen";

export type AdminStackParamList = {
    BeginOrContinueSurveyScreen: undefined;
    WelcomeWalkthroughScreen: undefined;
    CreateSurvey: { surveyId: string; editing: true } | undefined;
    SaveAdminCodeScreen: { surveyId: string };
    UploadRedLineBoundaryScreen: { surveyId: string; editing?: boolean };
    AddSurveyorScreen: { surveyId: string; editing?: boolean };
    ReviewSurveyDetailsScreen: { surveyId: string };
    ShareCodeScreen: { surveyId: string };
    AdminCodeScreen: undefined;
    SurveyStatusScreen: { surveyId: string };
    SurveyorResultsScreen: { surveyId: string; surveyorId: string; locationId: string; viewOnly: true };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="BeginOrContinueSurveyScreen" component={BeginOrContinueSurveyScreen} />
            <Stack.Screen name="WelcomeWalkthroughScreen" component={WelcomeWalkthroughScreen} />
            <Stack.Screen name="SaveAdminCodeScreen" component={SaveAdminCodeScreen} />
            <Stack.Screen name="CreateSurvey" component={CreateSurvey} />
            <Stack.Screen name="UploadRedLineBoundaryScreen" component={UploadRedLineBoundaryScreen} />
            <Stack.Screen name="AddSurveyorScreen" component={AddSurveyorScreen} />
            <Stack.Screen name="ReviewSurveyDetailsScreen" component={ReviewSurveyDetailsScreen} />
            <Stack.Screen name="ShareCodeScreen" component={ShareCodeScreen} />
            <Stack.Screen name="AdminCodeScreen" component={AdminCodeScreen} />
            <Stack.Screen name="SurveyStatusScreen" component={SurveyStatusScreen} />
            <Stack.Screen name="SurveyorResultsScreen" component={SurveySummaryScreen} />
        </Stack.Navigator>
    )
}
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { BeginOrContinueSurveyScreen } from "@screens/Admin/BeginOrContinueSurveyScreen";
import { CreateSurvey } from "@screens/Admin/CreateSurvey";
import { UploadRedLineBoundaryScreen } from "@screens/Admin/UploadRedLineBoundaryScreen"
import { AddSurveyorScreen } from "@screens/Admin/AddSurveyorScreen";
import { ReviewSurveyDetailsScreen } from "@screens/Admin/ReviewSurveyDetailsScreen";
import { SurveySavedScreen } from "@screens/Admin/SurveySavedScreen";
import { ShareCodeScreen } from "@screens/Admin/ShareCodeScreen";
import { AdminCodeScreen } from "@screens/Admin/AdminCodeScreen";
import { SurveyStatusScreen } from "@screens/Admin/SurveyStatusScreen";
import { SaveAdminCodeScreen } from "@screens/Admin/SaveAdminCodeScreen";
import { WelcomeWalkthroughScreen } from "@screens/Admin/WelcomeWalkthroughScreen";

export type AdminStackParamList = {
    BeginOrContinueSurveyScreen: undefined;
    WelcomeWalkthroughScreen: undefined;
    CreateSurvey: undefined;
    SaveAdminCodeScreen: { surveyId: string };
    UploadRedLineBoundaryScreen: { surveyId: string };
    AddSurveyorScreen: { surveyId: string };
    ReviewSurveyDetailsScreen: { surveyId: string };
    SurveySavedScreen: undefined;
    ShareCodeScreen: { surveyId: string };
    AdminCodeScreen: undefined;
    SurveyStatusScreen: { surveyId: string };
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
            <Stack.Screen name="SurveySavedScreen" component={SurveySavedScreen} />
            <Stack.Screen name="ShareCodeScreen" component={ShareCodeScreen} />
            <Stack.Screen name="AdminCodeScreen" component={AdminCodeScreen} />
            <Stack.Screen name="SurveyStatusScreen" component={SurveyStatusScreen} />
        </Stack.Navigator>
    )
}
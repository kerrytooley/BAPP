import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { BeginOrContinueSurveyScreen } from "@screens/Admin/BeginOrContinueSurveyScreen";
import { CreateSurvey } from "@screens/Admin/CreateSurvey";
import { EmailScreen } from "@screens/Admin/EmailScreen";
import { UploadRedLineBoundaryScreen } from "@screens/Admin/UploadRedLineBoundaryScreen"
import { AddSurveyorScreen } from "@screens/Admin/AddSurveyorScreen";
import { ReviewSurveyDetailsScreen } from "@screens/Admin/ReviewSurveyDetailsScreen";

export type AdminStackParamList = {
    BeginOrContinueSurveyScreen: undefined;
    EmailScreen: { surveyId: string };
    CreateSurvey: { surveyId: string };
    UploadRedLineBoundaryScreen: { surveyId: string };
    AddSurveyorScreen: { surveyId: string };
    ReviewSurveyDetailsScreen: { surveyId: string };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="BeginOrContinueSurveyScreen" component={BeginOrContinueSurveyScreen} />
            <Stack.Screen name="EmailScreen" component={EmailScreen} />
            <Stack.Screen name="CreateSurvey" component={CreateSurvey} />
            <Stack.Screen name="UploadRedLineBoundaryScreen" component={UploadRedLineBoundaryScreen} />
            <Stack.Screen name="AddSurveyorScreen" component={AddSurveyorScreen} />
            <Stack.Screen name="ReviewSurveyDetailsScreen" component={ReviewSurveyDetailsScreen} />
        </Stack.Navigator>
    )
}
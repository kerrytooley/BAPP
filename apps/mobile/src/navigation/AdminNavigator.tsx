import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { BeginOrContinueSurveyScreen } from "@screens/BeginOrContinueSurveyScreen";
import { CreateSurvey } from "@screens/CreateSurvey";
import { EmailScreen } from "@screens/EmailScreen";

export type AdminStackParamList = {
    BeginOrContinueSurveyScreen: undefined;
    EmailScreen: { surveyId: string };
    CreateSurvey: { surveyId: string };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="BeginOrContinueSurveyScreen" component={BeginOrContinueSurveyScreen} />
            <Stack.Screen name="EmailScreen" component={EmailScreen} />
            <Stack.Screen name="CreateSurvey" component={CreateSurvey} />
        </Stack.Navigator>
    )
}
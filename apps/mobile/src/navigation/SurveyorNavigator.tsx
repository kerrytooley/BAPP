import { InputCodeScreen } from "@screens/Surveyor/InputCodeScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CodeConfirmationScreen } from "@screens/Surveyor/CodeConfirmationScreen";

export type SurveyorStackParamList = {
    InputCodeScreen: undefined,
    CodeConfirmationScreen: { surveyId: string }
};

const Stack = createNativeStackNavigator<SurveyorStackParamList>();

export function SurveyorNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="InputCodeScreen" component={InputCodeScreen} />
            <Stack.Screen name="CodeConfirmationScreen" component={CodeConfirmationScreen} />
        </Stack.Navigator>
    )
}
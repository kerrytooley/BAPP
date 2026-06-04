import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { BeginOrContinueSurveyScreen } from "@screens/BeginOrContinueSurveyScreen";


const Stack = createNativeStackNavigator();

export function AdminNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="BeginOrContinueSurveyScreen" component={BeginOrContinueSurveyScreen} />
        </Stack.Navigator>
    )
}
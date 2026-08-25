import { InputCodeScreen } from "@screens/Surveyor/InputCodeScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CodeConfirmationScreen } from "@screens/Surveyor/CodeConfirmationScreen";
import { SelectSurveyorScreen } from "@screens/Surveyor/SelectSurveyorScreen";
import { ConfirmSurveyorDetailsScreen } from "@screens/Surveyor/ConfirmSurveyorDetailsScreen";
import { SurveyorConfirmLocationScreen } from "@screens/Surveyor/SurveyorConfirmLocationScreen";
import { WeatherConditionsScreen } from "@screens/Surveyor/WeatherConditionsScreen";
import { SelectSpeciesPage } from "@screens/Surveyor/SelectSpeciesScreen";
import { CapturePhotoScreen } from "@screens/Surveyor/CapturePhotoScreen";
import { SetupCompleteScreen } from "@screens/Surveyor/SetupCompleteScreen";
import { SurveyScreen } from "@screens/Surveyor/SurveyScreen";
import { AddObservationScreen } from "@screens/Surveyor/AddObservationScreen";
import { MediaType } from "@bapp/domain";

export type SurveyorStackParamList = {
    InputCodeScreen: undefined,
    CodeConfirmationScreen: { surveyId: string }
    SelectSurveyorScreen: { surveyId: string }
    ConfirmSurveyorDetailsScreen: { surveyId: string, surveyorId: string }
    SurveyorConfirmLocationScreen: { surveyId: string, surveyorId: string }
    WeatherConditionsScreen: { surveyId: string, surveyorId: string }
    CapturePhotoScreen: { surveyId: string, locationId: string, surveyorId: string, photoType: MediaType }
    SetupCompleteScreen: { surveyId: string, locationId: string, surveyorId: string }
    SurveyScreen: { surveyId: string, locationId: string, surveyorId: string }
    SelectSpeciesScreen: { surveyId: string, locationId: string, surveyorId: string }
    AddObservationScreen: { surveyId: string, observationId: string, surveyorId: string, locationId: string }
};

const Stack = createNativeStackNavigator<SurveyorStackParamList>();

export function SurveyorNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="InputCodeScreen" component={InputCodeScreen} />
            <Stack.Screen name="CodeConfirmationScreen" component={CodeConfirmationScreen} />
            <Stack.Screen name="SelectSurveyorScreen" component={SelectSurveyorScreen} />
            <Stack.Screen name="ConfirmSurveyorDetailsScreen" component={ConfirmSurveyorDetailsScreen} />
            <Stack.Screen name="SurveyorConfirmLocationScreen" component={SurveyorConfirmLocationScreen} />
            <Stack.Screen name="WeatherConditionsScreen" component={WeatherConditionsScreen} />
            <Stack.Screen name="CapturePhotoScreen" component={CapturePhotoScreen} />
            <Stack.Screen name="SetupCompleteScreen" component={SetupCompleteScreen} />
            <Stack.Screen name="SurveyScreen" component={SurveyScreen} />
            <Stack.Screen name="SelectSpeciesScreen" component={SelectSpeciesPage} />
            <Stack.Screen name="AddObservationScreen" component={AddObservationScreen} />
        </Stack.Navigator>
    )
}
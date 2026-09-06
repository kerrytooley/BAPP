import { BackButton, Button } from "@components/Button";
import { Title } from "@components/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React from "react";
import { ScrollView, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { BatGrid } from "@components/BatGrid";
import { bats } from "../../data/bats";
import { useSurveyService } from "@services/surveyServiceContext";
import { CreateObservationInput } from "@bapp/domain";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function SelectSpeciesPage(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, locationId, surveyorId } = useRoute<RouteProp<SurveyorStackParamList, 'SelectSpeciesScreen'>>().params;
    const service = useSurveyService();

    const handlePress = async (species: string) => {
        try {
            const now = new Date();
            const newObservation = await service.addObservation({
                surveyId: surveyId,
                locationId: locationId,
                surveyorId: surveyorId,
                species: species,
                firstSeenAt: now,
                lastSeenAt: now
            } as CreateObservationInput);
            console.log('Observation added: ', newObservation);
            const observationId = newObservation?.id;
            navigation.push("AddObservationScreen", { surveyId, observationId, surveyorId, locationId })
        } catch (e) {
            console.error("Error creating observation on surveyor: ", surveyorId, species, e);
        }
    }

    return (
        <View style={screen.justifyScreen}>
            <ScrollView style={screen.scroll} contentContainerStyle={screen.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={{ width: "100%" }}>
                    <BackButton navigation={navigation} />
                    <Title title="Add New Bat Type" subtitle="Tap species to continue" />
                </View>
                <View style={[screen.content, { marginTop: 16 }]} >
                    <BatGrid bats={bats} onPress={(species) => handlePress(species)} />
                </View>
                <Button label="Unknown" variant="dark" action="right arrow" onPress={() => handlePress("Unknown")} />
            </ScrollView >
        </View>
    )
}
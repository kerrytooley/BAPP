import { BackButton, Button } from "@components/Common/Button";
import { Title } from "@components/Common/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, View, Text } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { BatGrid } from "@components/Display/BatGrid";
import { bats } from "../../data/bats";
import { useSurveyService } from "@services/surveyServiceContext";
import { CreateObservationInput } from "@bapp/domain";
import { colours } from "@theme/colours";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function SelectSpeciesPage(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, locationId, surveyorId } = useRoute<RouteProp<SurveyorStackParamList, 'SelectSpeciesScreen'>>().params;
    const service = useSurveyService();
    const [isLoading, setIsLoading] = useState(false);
    const isSubmittingRef = useRef(false);

    const handlePress = async (species: string) => {
        isSubmittingRef.current = true;
        setIsLoading(true);

        try {
            const now = new Date();
            const newObservation = await service.addObservation({
                surveyId,
                locationId,
                surveyorId,
                species,
                firstSeenAt: now,
                lastSeenAt: now
            } as CreateObservationInput);

            console.log("Observation created:", newObservation.id);
            const observationId = newObservation?.id;
            console.log("Navigating to add observation screen: ", observationId);
            navigation.navigate("AddObservationScreen", {
                surveyId,
                observationId,
                surveyorId,
                locationId
            });

        } catch (e) {
            console.error("Error creating observation", e);
        } finally {
            setIsLoading(false);
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
                    <BatGrid isLoading={isLoading} bats={bats} onPress={(species) => handlePress(species)} />
                </View>
            </ScrollView >
            {isLoading && (
                <View style={styles.modalBackdrop}>
                    <View style={styles.modal}>
                        <Text>Loading</Text>
                    </View>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        borderRadius: 16,
        backgroundColor: colours.cardbackground,
        padding: 24,
    },
});
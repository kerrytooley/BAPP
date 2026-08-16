import { BackButton, Button, ButtonGroup } from "@components/Button";
import { screen } from "@theme/screen";
import { ScrollView, View } from "react-native";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { Title } from "@components/Titles";
import { TimeOfObservation } from "@components/TimeOfObservation";
import { HeardAndSeenCount } from "@components/HeardAndSeenCount";
import React, { useEffect, useState } from "react";
import { Observation, UpdateObservationInput } from "@bapp/domain";
import { useSurveyService } from "@services/surveyServiceContext";
import { InputField } from "@components/InputField";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function AddObservationScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, observationId, surveyorId, locationId } = useRoute<RouteProp<SurveyorStackParamList, 'AddObservationScreen'>>().params;

    const service = useSurveyService();
    const [observation, setObservation] = useState<Observation>();

    const [observationTime, setObservationTime] = useState<Date>(new Date());
    const [seenCount, setSeenCount] = useState<number>(0);
    const [heardCount, setHeardCount] = useState<number>(0);
    const [frequency, setFrequency] = useState<string>();
    const [direction, setDirection] = useState<string>();
    const [notes, setNotes] = useState<string>();


    useEffect(() => {
        const loadContext = async () => {
            try {
                const { observations } = await service.getSurveyContext(surveyId);
                const currentObservation = observations.find((observation) => observation.id === observationId);
                currentObservation && setObservation(currentObservation);
                currentObservation?.firstSeenAt && setObservationTime(currentObservation.firstSeenAt);
                currentObservation?.seenCount && setSeenCount(currentObservation.seenCount);
                currentObservation?.heardCount && setHeardCount(currentObservation.heardCount);
                currentObservation?.frequency && setFrequency(currentObservation.frequency);
                currentObservation?.direction && setDirection(currentObservation.direction);
                currentObservation?.notes && setFrequency(currentObservation.notes);

            } catch (e) {
                console.error("Error loading survey context", e);
            }
        };
        loadContext();
    }, [surveyId, observationId]);

    const updateObservation = async () => {
        try {
            const observationInput = {
                seenCount: seenCount,
                heardCount: heardCount,
                frequency: frequency ?? null,
                direction: direction ?? null,
                notes: notes ?? null,
                flightPaths: undefined,
                data: undefined
            } as UpdateObservationInput;
            const updatedObservation = await service.updateObservation(observationId, observationInput);
            console.log("Successfully updated observation: ", observationId, updatedObservation);
            navigation.navigate('SurveyScreen', { surveyId, locationId, surveyorId })
        } catch (e) {
            console.error("Error updating observation: ", observationId, e);
        }
    }

    const deleteObservation = async () => {
        try {
            const deletedObservation = await service.removeObservation(observationId);
            console.log("Successfully deleted observation: ", observationId, deletedObservation);
            navigation.navigate('SurveyScreen', { surveyId, locationId, surveyorId })
        } catch (e) {
            console.log("Error deleting observation: ", observationId, e);
        }
    }

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
                <Title title={observation?.species || "Unknown Species"} />
            </View>
            <ScrollView style={screen.scroll} contentContainerStyle={[screen.scrollContent, { gap: 24 }]} keyboardShouldPersistTaps="handled">
                <View style={screen.content} >
                    <TimeOfObservation
                        observationTime={observationTime}
                        onChange={setObservationTime} />
                    <HeardAndSeenCount
                        heardCount={heardCount}
                        seenCount={seenCount}
                        onChangeHeard={setHeardCount}
                        onChangeSeen={setSeenCount} />
                    <InputField
                        fieldLabel="Frequency reading"
                        placeholderText="Add reading"
                        variant="unit"
                        unit="Hz"
                        value={frequency}
                        onChangeText={setFrequency} />

                    <InputField
                        fieldLabel="Direction of Travel"
                        placeholderText="e.g. N > S"
                        value={direction}
                        onChangeText={setDirection} />
                    <InputField
                        fieldLabel="Notes"
                        placeholderText="Add notes"
                        size="large"
                        value={notes}
                        onChangeText={setNotes}
                    />
                </View>
                <ButtonGroup
                    labels={["Save Observation", "Delete Observation"]}
                    variant="mixed"
                    onPress={[() => updateObservation(),
                    () => deleteObservation()]} />
            </ScrollView>
        </View>
    )
}

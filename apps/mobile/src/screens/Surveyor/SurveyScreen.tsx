import { BackButton, Button } from "@components/Button";
import { CountdownClock } from "@components/CountdownClock";
import { PreviousEntriesSection } from "@components/PreviousEntriesSection";
import { screen } from "@theme/screen";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSurveyService } from "@services/surveyServiceContext";
import { Observation, Survey } from "@bapp/domain";
import { Toast } from "@components/Toast";


type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function SurveyScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId } = useRoute<RouteProp<SurveyorStackParamList, 'SurveyScreen'>>().params;
    const service = useSurveyService();

    const [observations, setObservations] = useState<Observation[]>([]);
    const [survey, setSurvey] = useState<Survey>();
    const [toast, setToast] = useState<{ message: string; undo: () => void }>();

    const applyObservation = (updated: Observation) => {
        setObservations((prev) =>
            prev.map((o) => (o.id === updated.id ? updated : o)));
    };

    const showToast = (message: string, previous: Observation) => {
        setToast({
            message,
            undo: async () => {
                setToast(undefined);
                try {
                    const reverted = await service.updateObservation(previous.id, {
                        seenCount: previous.seenCount,
                        heardCount: previous.heardCount,
                        lastSeenAt: previous.lastSeenAt,
                    });
                    applyObservation(reverted);
                } catch (e) {
                    console.error("Error undoing count update: ", previous.id, e);
                }
            },
        });
    };

    const formatTime = (date: Date) =>
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    useEffect(() => {
        const loadContext = async () => {
            try {
                const context = await service.getSurveyContext(surveyId);
                const surveyorObservations = context.observations.filter((observation) => observation.surveyorId === surveyorId);
                surveyorObservations && setObservations(surveyorObservations);
                const survey = context.survey;
                survey && setSurvey(survey);
            } catch (e) {
                console.error("Error loading survey context", e)
            }
        };
        loadContext();
    }, [surveyId, surveyorId])

    const addHeard = async (observation: Observation) => {
        try {
            const updatedObservation = await service.updateObservation(observation.id, { heardCount: observation.heardCount + 1, lastSeenAt: new Date() });
            applyObservation(updatedObservation);
            showToast(
                `Heard count updated to ${updatedObservation.heardCount}. Last seen ${updatedObservation.lastSeenAt ? formatTime(updatedObservation.lastSeenAt) : ""}`.trim(),
                observation,
            );
            console.log("Succesfully added heard count: ", updatedObservation.id, updatedObservation.heardCount);
        } catch (e) {
            console.error("Error updating heard count: ", observation.id, e)
        }
    }

    const addSeen = async (observation: Observation) => {
        try {
            const updatedObservation = await service.updateObservation(observation.id, { seenCount: observation.seenCount + 1, lastSeenAt: new Date() })
            applyObservation(updatedObservation);
            showToast(
                `Seen count updated to ${updatedObservation.seenCount}. Last seen ${updatedObservation.lastSeenAt ? formatTime(updatedObservation.lastSeenAt) : ""}`.trim(),
                observation,
            );
            console.log("Succesfully added seen count: ", updatedObservation.id, updatedObservation.seenCount);
        } catch (e) {
            console.error("Error updating seen count: ", observation.id, e)
        }
    }

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }} >
                <BackButton navigation={navigation} />
            </View>
            <View style={styles.content} >
                {survey?.startTime && survey.endTime &&
                    <CountdownClock startTime={survey?.startTime} endTime={survey?.endTime} />
                }
                <Button
                    action="add"
                    label="Add new bat observation"
                    onPress={() => navigation.push('SelectSpeciesScreen', { surveyId, surveyorId, locationId })} />
                <PreviousEntriesSection
                    observations={observations}
                    onAddHeard={(observation) => addHeard(observation)}
                    onAddSeen={(observation) => addSeen(observation)}
                    onEdit={(observationId) => navigation.navigate("AddObservationScreen", { surveyId, locationId, surveyorId, observationId })} />
            </View>
            <Toast
                visible={!!toast}
                message={toast?.message ?? ""}
                onUndo={() => toast?.undo()}
                onDone={() => setToast(undefined)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        ...screen.content,
        gap: 48,
        justifyContent: "flex-start",
        flex: 1,
        paddingVertical: 8
    }
})
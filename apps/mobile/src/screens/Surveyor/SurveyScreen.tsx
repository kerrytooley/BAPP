import { BackButton, Button } from "@components/Common/Button";
import { CountdownClock } from "@components/DateTime/CountdownClock";
import { PreviousEntriesSection } from "@components/Observation/PreviousEntriesSection";
import { screen } from "@theme/screen";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { Toast } from "@components/Common/Toast";
import { NotesProps, Observation } from "@bapp/domain";
import { LocationInfoModal } from "@components/Modals/AddLocationInfoModal";


type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function SurveyScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId } = useRoute<RouteProp<SurveyorStackParamList, 'SurveyScreen'>>().params;
    const service = useSurveyService();
    const { context } = useActiveSurvey();

    const survey = context?.survey;
    const surveyor = context?.surveyors.find((surveyor) => surveyor.id === surveyorId);
    const observations = context?.observations.filter((observation) => observation.surveyorId === surveyorId) ?? [];

    const [toast, setToast] = useState<{ message: string; undo: () => void }>();
    const [locationNotes, setLocationNotes] = useState<NotesProps[]>([]);
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

    const showToast = (message: string, previous: Observation) => {
        setToast({
            message,
            undo: async () => {
                setToast(undefined);
                try {
                    await service.updateObservation(previous.id, {
                        seenCount: previous.seenCount,
                        heardCount: previous.heardCount,
                        lastSeenAt: previous.lastSeenAt,
                    });
                } catch (e) {
                    console.error("Error undoing count update: ", previous.id, e);
                }
            },
        });
    };

    const formatTime = (date: Date) =>
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const addHeard = async (observation: Observation) => {
        try {
            const updatedObservation = await service.updateObservation(observation.id, { heardCount: observation.heardCount + 1, lastSeenAt: new Date() });
            showToast(
                `Heard count updated to ${updatedObservation.heardCount}. Last seen ${updatedObservation.lastSeenAt ? formatTime(updatedObservation.lastSeenAt) : ""}`.trim(),
                observation,
            );
        } catch (e) {
            console.error("Error updating heard count: ", observation.id, e)
        }
    }

    const addSeen = async (observation: Observation) => {
        try {
            const updatedObservation = await service.updateObservation(observation.id, { seenCount: observation.seenCount + 1, lastSeenAt: new Date() })
            showToast(
                `Seen count updated to ${updatedObservation.seenCount}. Last seen ${updatedObservation.lastSeenAt ? formatTime(updatedObservation.lastSeenAt) : ""}`.trim(),
                observation,
            );
        } catch (e) {
            console.error("Error updating seen count: ", observation.id, e)
        }
    }

    const saveNote = async (note: NotesProps | undefined) => {
        if (note) {
            try {
                const updatedNotes = [...locationNotes, note];
                await service.updateLocation(locationId, { notes: updatedNotes })
                console.log(`Updated location notes: ${updatedNotes.entries}`);
                setLocationNotes(updatedNotes);
            } catch (e) {
                console.error(`Error updating location notes: `, e);
            }
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
                <View style={{ gap: 16 }}>
                    <Button
                        action="add"
                        label="Add new bat observation"
                        onPress={() => navigation.push('SelectSpeciesScreen', { surveyId, surveyorId, locationId })} />
                    <Button
                        action="add"
                        label="Add survey note"
                        onPress={() => setIsFullScreen(true)} />
                </View>
                <LocationInfoModal
                    isFullScreen={isFullScreen}
                    setIsFullScreen={(is) => setIsFullScreen(is)}
                    saveNote={(note) => saveNote(note)} />
                <PreviousEntriesSection
                    observations={observations}
                    notes={locationNotes}
                    onAddHeard={(observation) => addHeard(observation)}
                    onAddSeen={(observation) => addSeen(observation)}
                    onEdit={(observationId) => navigation.navigate("AddObservationScreen", { surveyId, locationId, surveyorId, observationId })} />
            </View>
            <Button label="End Survey" onPress={() => {
                const type = "end";
                surveyor?.isLead
                    ? navigation.navigate('WeatherConditionsScreen', { surveyId, surveyorId, locationId, type })
                    : navigation.navigate('SurveySummaryScreen', { surveyId, surveyorId, locationId })

            }
            } />
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
        gap: 24,
        justifyContent: "flex-start",
        flex: 1,
        paddingVertical: 8
    }
})
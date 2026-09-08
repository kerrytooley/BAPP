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

    const [addToast, setAddToast] = useState<{ message: string; undo: () => void; }>();
    const [deleteToast, setDeleteToast] = useState<{ message: string; cancel: () => void; confirm: () => void; }>();
    const [endToast, setEndToast] = useState<{ message: string; cancel: () => void; confirm: () => void; }>();
    const [locationNotes, setLocationNotes] = useState<NotesProps[]>([]);
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

    const showAddToast = (message: string, previous: Observation) => {
        setAddToast({
            message,
            undo: async () => {
                setAddToast(undefined);
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

    const showDeleteToast = (message: string, previous: Observation) => {
        setDeleteToast({
            message,
            cancel: async () => {
                setDeleteToast(undefined);
            },
            confirm: async () => {
                setDeleteToast(undefined);
                try {
                    await service.removeObservation(previous.id);
                    console.log("Successfully deleted observation: ", [previous.id]);
                } catch (e) {
                    console.error("Error deleting observation", e);
                }
            }
        });
    };

    const formatTime = (date: Date) =>
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const addHeard = async (observation: Observation) => {
        try {
            const updatedObservation = await service.updateObservation(observation.id, { heardCount: observation.heardCount + 1, lastSeenAt: new Date() });
            showAddToast(
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
            showAddToast(
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

    const showEndToast = (message: string) => {
        setEndToast({
            message,
            cancel: async () => {
                setEndToast(undefined);
            },
            confirm: async () => {
                setEndToast(undefined);
                const type = "end";
                surveyor?.isLead
                    ? navigation.navigate('WeatherConditionsScreen', { surveyId, surveyorId, locationId, type })
                    : navigation.navigate('SurveySummaryScreen', { surveyId, surveyorId, locationId })
            }
        });
    };

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }} >
                <BackButton navigation={navigation} />
            </View>
            <View style={styles.content} >
                {survey?.startTime && survey.endTime &&
                    <CountdownClock startTime={survey?.startTime} endTime={survey?.endTime} />
                }
                <Button label="End Survey" onPress={() => {
                    showEndToast(`End Survey?`)
                }
                } />
                <LocationInfoModal
                    isFullScreen={isFullScreen}
                    setIsFullScreen={(is) => setIsFullScreen(is)}
                    saveNote={(note) => saveNote(note)} />
                <PreviousEntriesSection
                    observations={observations}
                    notes={locationNotes}
                    onAddHeard={(observation) => addHeard(observation)}
                    onAddSeen={(observation) => addSeen(observation)}
                    onEdit={(observationId) => navigation.navigate("AddObservationScreen", { surveyId, locationId, surveyorId, observationId })}
                    onDelete={(observation) => showDeleteToast(
                        `Delete observation ${observation.species} ${formatTime(observation.createdAt)} ?`,
                        observation
                    )}
                />
            </View>
            <View style={{ gap: 16 }}>
                <Button
                    variant="light"
                    action="add"
                    label="Add new bat observation"
                    onPress={() => navigation.navigate('SelectSpeciesScreen', { surveyId, surveyorId, locationId })} />
                <Button
                    action="add"
                    label="Add survey note"
                    onPress={() => setIsFullScreen(true)} />
            </View>
            <Toast
                visible={!!addToast}
                message={addToast?.message ?? ""}
                onUndo={() => addToast?.undo()}
                onDone={() => setAddToast(undefined)}
                position={16}
            />
            <Toast
                visible={!!deleteToast}
                message={deleteToast?.message ?? ""}
                onCancel={() => deleteToast?.cancel()}
                onConfirm={() => deleteToast?.confirm()}
                position={360}
            />
            <Toast
                visible={!!endToast}
                message={endToast?.message ?? ""}
                onCancel={() => endToast?.cancel()}
                onConfirm={() => endToast?.confirm()}
                position={360}
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
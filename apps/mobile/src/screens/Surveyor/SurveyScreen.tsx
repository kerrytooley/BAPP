import { ScreenHeader } from "@components/Common/ScreenHeader";
import { Button } from "@components/Common/Button";
import { CountdownClock } from "@components/DateTime/CountdownClock";
import { PreviousEntriesSection } from "@components/Observation/PreviousEntriesSection";
import { screen } from "@theme/screen";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { RootStackParamList } from "@navigators/index";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { Toast } from "@components/Common/Toast";
import { NotesProps, Observation } from "@bapp/domain";
import { LocationInfoModal } from "@components/Modals/AddLocationInfoModal";
import { ConfirmModal } from "@components/Modals/ConfirmModal";

const RETURN_HOME_DELAY_MS = 2500;

type Nav = CompositeNavigationProp<
    NativeStackNavigationProp<SurveyorStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
>;

export function SurveyScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId } = useRoute<RouteProp<SurveyorStackParamList, 'SurveyScreen'>>().params;
    const service = useSurveyService();
    const { context } = useActiveSurvey();

    const survey = context?.survey;
    const surveyor = context?.surveyors.find((surveyor) => surveyor.id === surveyorId);
    const observations = context?.observations.filter((observation) => observation.surveyorId === surveyorId) ?? [];

    const [addToast, setAddToast] = useState<{ message: string; undo: () => void; }>();
    const [confirmation, setConfirmation] = useState<{
        title: string;
        message?: string;
        confirmLabel: string;
        cancelLabel?: string;
        /** False for acknowledge-only prompts (single button). */
        cancellable?: boolean;
        destructive?: boolean;
        loading?: boolean;
        confirm: () => void;
        cancel?: () => void;
    }>();
    const returnHomeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
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

    const confirmDelete = (observation: Observation) => {
        setConfirmation({
            title: "Delete observation?",
            message: `${observation.species} recorded at ${formatTime(observation.createdAt)}. This can't be undone.`,
            confirmLabel: "Delete",
            destructive: true,
            confirm: async () => {
                setConfirmation(undefined);
                try {
                    await service.removeObservation(observation.id);
                    console.log("Successfully deleted observation: ", [observation.id]);
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

    const endSurvey = () => {
        setConfirmation(undefined);
        const type = "end";
        surveyor?.isLead
            ? navigation.navigate('WeatherConditionsScreen', { surveyId, surveyorId, locationId, type })
            : navigation.navigate('SurveySummaryScreen', { surveyId, surveyorId, locationId })
    };

    const confirmEnd = () => {
        const timeRemaining = !!survey?.endTime && survey.endTime.getTime() > Date.now();
        setConfirmation({
            title: "End survey?",
            message: timeRemaining
                ? "This survey still has time remaining. Are you sure you want to end it?"
                : "Make sure you've recorded all your observations before ending.",
            confirmLabel: "End survey",
            destructive: timeRemaining,
            confirm: endSurvey,
        });
    };

    const returnHome = () => {
        // Writes are already persisted (offline-first), so this is just a pause the surveyor can cancel.
        returnHomeTimer.current = setTimeout(() => {
            setConfirmation(undefined);
            navigation.navigate("Welcome");
        }, RETURN_HOME_DELAY_MS);
        setConfirmation({
            title: "Saving your results",
            message: "Returning you home. Your survey stays open so you can continue later.",
            confirmLabel: "",
            loading: true,
            confirm: () => { },
            cancel: () => clearTimeout(returnHomeTimer.current),
        });
    };

    useEffect(() => () => clearTimeout(returnHomeTimer.current), []);

    // Reaching this screen means the surveyor has started; returning visits come straight back here.
    const surveyorStatus = surveyor?.status;
    useEffect(() => {
        if (surveyorStatus !== "pending" && surveyorStatus !== "confirmed") return;
        service.updateSurveyor(surveyorId, { status: "ready" })
            .catch((e) => console.error("Error marking surveyor as started", e));
    }, [service, surveyorId, surveyorStatus]);

    const startTimeMs = survey?.startTime?.getTime();
    const endTimeMs = survey?.endTime?.getTime();
    const isLead = surveyor?.isLead;

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        // Only times still ahead are scheduled, so re-opening the screen later doesn't re-prompt.
        const schedule = (timeMs: number | undefined, prompt: () => void) => {
            const delay = timeMs === undefined ? -1 : timeMs - Date.now();
            if (delay > 0) timers.push(setTimeout(prompt, delay));
        };
        schedule(startTimeMs, () => setConfirmation({
            title: "Time to begin the survey",
            message: "The survey start time has been reached. Start recording your observations.",
            confirmLabel: "Okay",
            cancellable: false,
            confirm: () => setConfirmation(undefined),
        }));
        schedule(endTimeMs, () => setConfirmation({
            title: "Survey end time reached",
            message: "End the survey now, or press Okay to keep recording.",
            confirmLabel: "End survey",
            cancelLabel: "Okay",
            confirm: endSurvey,
        }));
        return () => timers.forEach(clearTimeout);
        // Deliberately keyed on primitives: context re-emits create new Date objects every time.
    }, [startTimeMs, endTimeMs, isLead]);

    return (
        <View style={screen.justifyScreen} >
            <ScreenHeader navigation={navigation} onHome={returnHome} />
            <View style={styles.content} >
                {survey?.startTime && survey.endTime &&
                    <CountdownClock startTime={survey?.startTime} endTime={survey?.endTime} />
                }
                <Button label="End Survey" onPress={confirmEnd} />
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
                    onDelete={confirmDelete}
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
            <ConfirmModal
                visible={!!confirmation}
                title={confirmation?.title ?? ""}
                message={confirmation?.message}
                confirmLabel={confirmation?.confirmLabel}
                cancelLabel={confirmation?.cancelLabel}
                destructive={confirmation?.destructive}
                loading={confirmation?.loading}
                onConfirm={() => confirmation?.confirm()}
                onCancel={confirmation?.cancellable === false ? undefined : () => {
                    confirmation?.cancel?.();
                    setConfirmation(undefined);
                }}
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
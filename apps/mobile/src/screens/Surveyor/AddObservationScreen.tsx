import { ScreenHeader } from "@components/Common/ScreenHeader";
import { ButtonGroup } from "@components/Common/Button";
import { screen } from "@theme/screen";
import { Image, Keyboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { Title } from "@components/Common/Titles";
import { TimeOfObservation } from "@components/DateTime/TimeOfObservation";
import { HeardAndSeenCount } from "@components/Observation/HeardAndSeenCount";
import React, { useEffect, useRef, useState } from "react";
import { buildFlightPathGroups, copyFlightPath, FlightPath, flightPathKey, FlightPathSurface, lastSeenAfter, newFlightPath, UpdateObservationInput, validateFrequencyKhz, validateLastSeen } from "@bapp/domain";
import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { InputField } from "@components/Common/InputField";
import { Card } from "@components/Common/Card";
import { PlusButton as PlusIcon } from "@components/Common/Icons"
import { textStyles } from "@theme/fonts";
import { AddFlightPathBottomSheet, FlightPathOption } from "@components/BottomSheets/AddFlightPathBottomSheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { ConfirmModal } from "@components/Modals/ConfirmModal";
import { colours } from "@theme/colours";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

const emergenceOptions: { label: string; value: boolean }[] = [
    { label: "Yes", value: true },
    { label: "No", value: false }
];

export function AddObservationScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, observationId, surveyorId, locationId } = useRoute<RouteProp<SurveyorStackParamList, 'AddObservationScreen'>>().params;

    const service = useSurveyService();
    const { context } = useActiveSurvey();
    const observation = context?.observations.find((observation) => observation.id === observationId);

    const [observationTime, setObservationTime] = useState<Date>(new Date());
    const [lastSeenTime, setLastSeenTime] = useState<Date>(new Date());
    const [seenCount, setSeenCount] = useState<number>(0);
    const [heardCount, setHeardCount] = useState<number>(0);
    const [frequency, setFrequency] = useState<string>();
    const [direction, setDirection] = useState<string>();
    const [notes, setNotes] = useState<string>();
    const [emergence, setEmergence] = useState<boolean>(false);
    const [flightPaths, setFlightPaths] = useState<FlightPath[]>([]);
    const [boundaryImageUri, setBoundaryImageUri] = useState<string>();
    const [frontViewImageUri, setFrontViewImageUri] = useState<string>();
    const [activeSurface, setActiveSurface] = useState<FlightPathSurface>();


    const sheetRef = useRef<BottomSheetModal>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const seeded = useRef(false);

    const bumpLastSeen = () => setLastSeenTime(new Date());

    const handleChangeSeen = (count: number) => {
        setSeenCount(count);
        bumpLastSeen();
    };

    const handleChangeHeard = (count: number) => {
        setHeardCount(count);
        bumpLastSeen();
    };


    useEffect(() => {
        if (!observation || seeded.current) return;
        seeded.current = true;
        if (observation.firstSeenAt) setObservationTime(observation.firstSeenAt);
        setLastSeenTime(observation.lastSeenAt ?? observation.firstSeenAt ?? new Date());
        setSeenCount(observation.seenCount);
        setHeardCount(observation.heardCount);
        if (observation.frequency) setFrequency(observation.frequency);
        if (observation.direction) setDirection(observation.direction);
        if (observation.notes) setNotes(observation.notes);
        setEmergence(observation.emergence);
        setFlightPaths(observation.flightPaths);
    }, [observation]);

    useEffect(() => {
        const loadImages = async () => {
            try {
                const boundaryImageResult = await service.getBoundaryImage(surveyId);
                if (boundaryImageResult.status === "ready") {
                    setBoundaryImageUri(boundaryImageResult.url);
                }

                const frontViewImageResult = await service.getLocationImage(locationId, 'frontView');
                if (frontViewImageResult.status === "ready") {
                    setFrontViewImageUri(frontViewImageResult.url);
                }
            } catch (e) {
                console.error("Error loading observation media", e);
            }
        };
        loadImages();
    }, [service, surveyId, locationId]);

    const presentFlightPathSheet = (surface: FlightPathSurface) => {
        if (activeSurface === surface) {
            sheetRef.current?.present();
        } else {
            setActiveSurface(surface);
        }
    };

    const openFlightPathBottomSheet = (surface: FlightPathSurface) => {
        Keyboard.dismiss();
        presentFlightPathSheet(surface);
    };

    useEffect(() => {
        if (activeSurface) sheetRef.current?.present();
    }, [activeSurface]);

    const surveyObservations = context?.observations ?? [];
    const groupsFor = (surface: FlightPathSurface) =>
        buildFlightPathGroups(surveyObservations, surveyorId, surface)
            .filter((group) =>
                surface === "boundary" ||
                surveyObservations.find((o) => o.id === group.sourceObservationId)!.locationId === locationId,
            );
    const pathsOn = (surface: FlightPathSurface) => flightPaths.filter((path) => path.surface === surface);
    // The saved path the draft currently holds on `surface`, if its strokes are a saved path.
    const savedGroup = (surface: FlightPathSurface) => {
        const key = observation && flightPathKey({ ...observation, flightPaths }, surface);
        return key ? groupsFor(surface).find((group) => group.key === key) : undefined;
    };

    // Reusing a path stores a copy of it; freshly drawn strokes become a new lettered path.
    const commitFlightPath = (surface: FlightPathSurface, paths: FlightPath[]) => {
        const stamped = paths.some((path) => !path.pathKey)
            ? newFlightPath(paths, surveyObservations, surveyorId, surface)
            : paths;
        setFlightPaths((current) => [
            ...current.filter((path) => path.surface !== surface),
            ...stamped,
        ]);
    };

    const letterFor = (surface: FlightPathSurface): string | undefined =>
        savedGroup(surface)?.letter ?? pathsOn(surface)[0]?.label;

    const activeOptions: FlightPathOption[] = activeSurface
        ? groupsFor(activeSurface).map((group) => ({ letter: group.letter, key: group.key, paths: copyFlightPath(group) }))
        : [];
    const activeSavedKey = activeSurface ? savedGroup(activeSurface)?.key ?? null : null;

    const activeImageUri = activeSurface === "boundary" ? boundaryImageUri : frontViewImageUri;
    // A saved path is chosen as an option, never edited; only unsaved strokes reopen for drawing.
    const activePaths = activeSurface && !activeSavedKey ? pathsOn(activeSurface) : [];
    const hasPath = (surface: FlightPathSurface) => pathsOn(surface).length > 0;
    const flightPathLabel = (surface: FlightPathSurface, name: string) => {
        if (!hasPath(surface)) return `Add ${name} flight path`;
        const letter = letterFor(surface);
        return letter ? `Edit ${name} flight path ${letter}` : `Edit ${name} flight path`;
    };

    const isSubmitting = useRef(false);
    const [frequencyTouched, setFrequencyTouched] = useState(false);
    const frequencyError = validateFrequencyKhz(frequency);
    // Only shown after a save attempt so it doesn't flash while the times are being picked.
    const [timesChecked, setTimesChecked] = useState(false);
    // The pickers only set a time of day, so a last-seen time just after midnight is the next day.
    const lastSeenAt = lastSeenAfter(observationTime, lastSeenTime);
    const lastSeenError = validateLastSeen(observationTime, lastSeenAt);
    const scrollRef = useRef<ScrollView>(null);
    const optionalText = (value: string | undefined) => value?.trim() || null;

    const updateObservation = async () => {
        if (isSubmitting.current || frequencyError) return;
        if (lastSeenError) {
            setTimesChecked(true);
            scrollRef.current?.scrollTo({ y: 0, animated: true });
            return;
        }
        isSubmitting.current = true;
        try {
            const observationInput = {
                seenCount: seenCount,
                heardCount: heardCount,
                firstSeenAt: observationTime,
                lastSeenAt,
                frequency: optionalText(frequency),
                direction: optionalText(direction),
                notes: optionalText(notes),
                emergence: emergence,
                flightPaths,
            } satisfies UpdateObservationInput;
            const updatedObservation = await service.updateObservation(observationId, observationInput);
            console.log("Successfully updated observation: ", observationId, updatedObservation);
            navigation.navigate('SurveyScreen', { surveyId, locationId, surveyorId })
        } catch (e) {
            console.error("Error updating observation: ", observationId, e);
        } finally {
            isSubmitting.current = false;
        }
    }

    const deleteObservation = async () => {
        if (isSubmitting.current) return;
        isSubmitting.current = true;
        try {
            const deletedObservation = await service.removeObservation(observationId);
            console.log("Successfully deleted observation: ", observationId, deletedObservation);
            navigation.navigate('SurveyScreen', { surveyId, locationId, surveyorId })
        } catch (e) {
            console.log("Error deleting observation: ", observationId, e);
        } finally {
            isSubmitting.current = false;
        }
    }

    return (
        <View style={[screen.baseScreen, styles.screen]} >
            <View style={styles.header}>
                <ScreenHeader navigation={navigation} />
                <Title title={observation?.species || "Unknown Species"} />
            </View>
            <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={screen.content} >
                    <TimeOfObservation
                        label="First seen time"
                        observationTime={observationTime}
                        onChange={setObservationTime} />
                    <TimeOfObservation
                        label="Last seen time"
                        observationTime={lastSeenTime}
                        onChange={setLastSeenTime}
                        error={timesChecked ? lastSeenError : null} />
                    <HeardAndSeenCount
                        heardCount={heardCount}
                        seenCount={seenCount}
                        onChangeHeard={handleChangeHeard}
                        onChangeSeen={handleChangeSeen} />
                    <Card cardLabel="Emergence" contentStyle={styles.emergenceCard}>
                        <View style={styles.emergenceRow}>
                            <Text style={styles.emergenceLabel}>Emergence</Text>
                            <View style={styles.radioGroup} accessibilityRole="radiogroup">
                                {emergenceOptions.map((option) => {
                                    const selected = emergence === option.value;
                                    return (
                                        <TouchableOpacity
                                            hitSlop={16}
                                            key={option.label}
                                            style={styles.radioOption}
                                            onPress={() => setEmergence(option.value)}
                                            testID={`emergence-${option.label}`}
                                            accessibilityLabel={option.label}
                                            accessibilityRole="radio"
                                            accessibilityState={{ selected }}
                                        >
                                            <Text style={styles.radioLabel}>{option.label}</Text>
                                            <View style={styles.radioOuter}>
                                                {selected && <View style={styles.radioInner} />}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </Card>
                    <InputField
                        fieldLabel="Frequency reading"
                        placeholderText="Add reading"
                        variant="unit"
                        unit="kHz"
                        keyboardType="decimal-pad"
                        value={frequency}
                        onChangeText={setFrequency}
                        onEndEditing={() => setFrequencyTouched(true)}
                        error={frequencyTouched ? frequencyError : null} />
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
                    <Card cardLabel="Flight Paths" >
                        {boundaryImageUri &&
                            <TouchableOpacity style={styles.imagePreview} onPress={() => openFlightPathBottomSheet("boundary")} >
                                <Image source={{ uri: boundaryImageUri }} style={styles.previewImage} resizeMode="cover" />
                                <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.imageTextOverlay]}>
                                    <PlusIcon width={24} />
                                    <Text style={[styles.previewText]}>
                                        {flightPathLabel("boundary", "overhead")}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        }
                        {frontViewImageUri &&
                            <TouchableOpacity style={styles.imagePreview} onPress={() => openFlightPathBottomSheet("frontView")} >
                                <Image source={{ uri: frontViewImageUri }} style={styles.previewImage} resizeMode="cover" />
                                <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.imageTextOverlay]}>
                                    <PlusIcon width={24} />
                                    <Text style={[styles.previewText]}>
                                        {flightPathLabel("frontView", "front-view")}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        }
                    </Card>
                </View>
                <ButtonGroup
                    labels={["Save Observation", "Delete Observation"]}
                    variant="mixed"
                    disabled={[!!frequencyError, false]}
                    onPress={[() => updateObservation(),
                    () => setConfirmDelete(true)]} />
            </ScrollView>
            <ConfirmModal
                visible={confirmDelete}
                title="Delete observation?"
                message="This observation will be permanently deleted."
                confirmLabel="Delete"
                destructive
                onConfirm={() => {
                    setConfirmDelete(false);
                    void deleteObservation();
                }}
                onCancel={() => setConfirmDelete(false)}
            />
            {activeSurface && activeImageUri &&
                <AddFlightPathBottomSheet
                    key={activeSurface}
                    ref={sheetRef}
                    imageUri={activeImageUri}
                    surface={activeSurface}
                    initialPaths={activePaths}
                    initialKey={activeSavedKey}
                    options={activeOptions}
                    onCommit={(paths) => {
                        commitFlightPath(activeSurface, paths)
                        sheetRef.current?.dismiss()
                    }}
                />
            }
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        paddingTop: 60,
        paddingBottom: 48,
    },
    header: {
        width: "100%",
        marginBottom: 24,
    },
    scroll: {
        width: "100%",
        flex: 1,
    },
    scrollContent: {
        width: "100%",
        gap: 24,
        paddingBottom: 24,
    },
    imagePreview: {
        width: "100%",
        aspectRatio: 16 / 7,
        borderRadius: 12,
        overflow: "hidden",
    },
    previewImage: {
        width: "100%",
        height: "100%",
        opacity: 0.3,
    },
    imageTextOverlay: {
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    previewText: {
        ...textStyles.inputText,
        textAlign: "center",
        color: colours.light
    },
    emergenceCard: {
        minHeight: 0,
        paddingVertical: 16,
    },
    emergenceRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
    },
    emergenceLabel: {
        ...textStyles.subtitle,
    },
    radioGroup: {
        flexDirection: "row",
        alignItems: "center"
    },
    radioOption: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 24
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colours.inputBorder,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colours.light
    },
    radioLabel: {
        ...textStyles.subtitle
    }
})

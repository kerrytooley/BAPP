import { BackButton, ButtonGroup } from "@components/Button";
import { screen } from "@theme/screen";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { Title } from "@components/Titles";
import { TimeOfObservation } from "@components/TimeOfObservation";
import { HeardAndSeenCount } from "@components/HeardAndSeenCount";
import React, { useEffect, useRef, useState } from "react";
import { FlightPath, FlightPathSurface, UpdateObservationInput } from "@bapp/domain";
import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { InputField } from "@components/InputField";
import { Card } from "@components/Card";
import { PlusButton as PlusIcon } from "@components/icons"
import { textStyles } from "@theme/fonts";
import { AddFlightPathBottomSheet } from "@components/AddFlightPathBottomSheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
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
    // Seed the editable field buffers from the observation exactly once, when it
    // first becomes available. Guarded so later subscription re-emits can't wipe
    // in-progress edits.
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
        // Default last seen to first seen when it hasn't been recorded yet.
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
            // Already mounted for this surface; present directly since the
            // activeSurface state won't change to re-trigger the effect.
            sheetRef.current?.present();
        } else {
            setActiveSurface(surface);
        }
    };

    const openFlightPathBottomSheet = (surface: FlightPathSurface) => {
        presentFlightPathSheet(surface);
    };

    useEffect(() => {
        if (activeSurface) sheetRef.current?.present();
    }, [activeSurface]);

    const commitPaths = (surface: FlightPathSurface, paths: FlightPath[]) => {
        setFlightPaths((currentPaths) => [
            ...currentPaths.filter((path) => path.surface !== surface),
            ...paths,
        ]);
    };

    const activeImageUri = activeSurface === "boundary" ? boundaryImageUri : frontViewImageUri;
    const activePaths = activeSurface
        ? flightPaths.filter((path) => path.surface === activeSurface)
        : [];
    const hasBoundaryPath = flightPaths.some((path) => path.surface === "boundary");
    const hasFrontViewPath = flightPaths.some((path) => path.surface === "frontView");

    const isSubmitting = useRef(false);

    const updateObservation = async () => {
        if (isSubmitting.current) return;
        isSubmitting.current = true;
        try {
            const observationInput = {
                seenCount: seenCount,
                heardCount: heardCount,
                firstSeenAt: observationTime,
                lastSeenAt: lastSeenTime,
                frequency: frequency ?? null,
                direction: direction ?? null,
                notes: notes ?? null,
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
                <BackButton navigation={navigation} />
                <Title title={observation?.species || "Unknown Species"} />
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={screen.content} >
                    <TimeOfObservation
                        label="First seen time"
                        observationTime={observationTime}
                        onChange={setObservationTime} />
                    <TimeOfObservation
                        label="Last seen time"
                        observationTime={lastSeenTime}
                        onChange={setLastSeenTime} />
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
                    <Card cardLabel="Flight Paths" >
                        {boundaryImageUri &&
                            <TouchableOpacity style={styles.imagePreview} onPress={() => openFlightPathBottomSheet("boundary")} >
                                <Image source={{ uri: boundaryImageUri }} style={styles.previewImage} resizeMode="cover" />
                                <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.imageTextOverlay]}>
                                    <PlusIcon width={24} />
                                    <Text style={[styles.previewText]}>
                                        {`${hasBoundaryPath ? "Edit" : "Add"} overhead flight path`}
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
                                        {`${hasFrontViewPath ? "Edit" : "Add"} front-view flight path`}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        }
                    </Card>
                </View>
                <ButtonGroup
                    labels={["Save Observation", "Delete Observation"]}
                    variant="mixed"
                    onPress={[() => updateObservation(),
                    () => deleteObservation()]} />
            </ScrollView>
            {activeSurface && activeImageUri &&
                <AddFlightPathBottomSheet
                    key={activeSurface}
                    ref={sheetRef}
                    imageUri={activeImageUri}
                    surface={activeSurface}
                    initialPaths={activePaths}
                    onCommitPath={(paths) => {
                        commitPaths(activeSurface, paths)
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

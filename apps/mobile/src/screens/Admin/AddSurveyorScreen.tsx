import { ScreenHeader } from "@components/Common/ScreenHeader";
import { ButtonGroup, InlineButton } from "@components/Common/Button";
import { SurveyorCard } from "@components/SurveyorCard";
import { Title } from "@components/Common/Titles";
import { screen } from "@theme/screen";
import { ScrollView, StyleSheet, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { BoundaryPosition, Surveyor } from "@bapp/domain";
import { AddLocationBottomSheet } from "@components/BottomSheets/AddLocationBottomSheet";
import { ConfirmModal } from "@components/Modals/ConfirmModal";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function AddSurveyorScreen(): React.JSX.Element {
    const { surveyId, editing = false } = useRoute<RouteProp<AdminStackParamList, 'AddSurveyorScreen'>>().params;
    const service = useSurveyService();
    const navigation = useNavigation<Nav>();
    const { context } = useActiveSurvey();

    const surveyors = context?.surveyors ?? [];
    const locations = context?.locations ?? [];

    const [activeSurveyorId, setActiveSurveyorId] = useState<string | null>(null);
    const [boundaryImageUrl, setBoundaryImageUrl] = useState<string | null>(null);
    const [showBoundaryRequired, setShowBoundaryRequired] = useState(false);
    // Local edit buffer keyed by surveyor id, so typing isn't clobbered by
    // subscription re-emits. Render the buffer value if present, else context.
    const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
    const sheetRef = useRef<BottomSheetModal>(null);
    // Guards the lead-surveyor auto-create so a subscription re-emit (while the
    // write is still catching up) can't fire it twice — the root cause of the
    // duplicate / linked lead surveyor boxes.
    const leadCreated = useRef(false);

    // Auto-create a single empty lead when the survey has none yet. The created
    // lead appears via the subscription; we never setState it here.
    useEffect(() => {
        if (!context || leadCreated.current) return;
        if (context.surveyors.length === 0) {
            leadCreated.current = true;
            service.addSurveyor(surveyId, { name: "", isLead: true })
                .catch((e) => console.error("Failed to create lead surveyor", e));
        }
    }, [context, service, surveyId]);

    useEffect(() => {
        service.getBoundaryImage(surveyId)
            .then((result) => setBoundaryImageUrl(result.status === 'ready' ? result.url : null))
            .catch((e) => console.error("Failed to fetch boundary image", e));
    }, [service, surveyId]);

    const displayName = (surveyor: Surveyor) =>
        nameDrafts[surveyor.id] ?? surveyor.name ?? "";

    // set selected surveyor when tapping between cards
    const activeSurveyor = surveyors.find((surveyor) => surveyor.id === activeSurveyorId);
    const activePosition = locations.find((location) => location.id === activeSurveyor?.locationId)?.boundaryPosition ?? null;

    const openLocationSheet = (surveyorId: string) => {
        setActiveSurveyorId(surveyorId);
        sheetRef.current?.present();
    };

    // add, remove and save actions — the list itself re-emits via the subscription
    const addSurveyor = async () => {
        try {
            const newSurveyor = await service.addSurveyor(surveyId, { name: "", isLead: false });
            console.log('Surveyor added:', newSurveyor);
        } catch (e) {
            console.log("Error adding surveyor", e);
        }
    };

    const removeSurveyor = async (id: string) => {
        const locationId = surveyors.find((s) => s.id === id)?.locationId ?? null;
        await service.removeSurveyor(id);
        console.log('Surveyor removed:', id);
        if (locationId) {
            try {
                await service.removeLocation(locationId);
                console.log('Surveyor location removed:', locationId);
            } catch (e) {
                console.log("Error removing surveyor location", e);
            }
        }
    }

    const updateName = (id: string, name: string) => {
        setNameDrafts((prev) => ({ ...prev, [id]: name }));
    }

    const saveLocation = async (position: BoundaryPosition) => {
        const surveyor = surveyors.find((s) => s.id === activeSurveyorId);
        if (!surveyor) return;

        try {
            if (surveyor.locationId) {
                const updatedLocation = await service.updateLocation(surveyor.locationId, { boundaryPosition: position });
                console.log('Surveyor location updated:', updatedLocation);
            } else {
                const location = await service.addLocation(surveyId, { boundaryPosition: position });
                await service.updateSurveyor(surveyor.id, { locationId: location.id });
                console.log('Surveyor location saved:', location);
            }
        } catch (e) {
            console.log("Error saving surveyor location", e);
        } finally {
            sheetRef.current?.dismiss();
        }
    }


    // continue checks
    const isLead = (surveyor: Surveyor) => surveyor.isLead
    const leadSurveyor = surveyors.find((surveyor) => surveyor.isLead);
    const canContinue = (leadSurveyor ? displayName(leadSurveyor) : "").trim().length > 0;

    const continueToReview = async () => {
        const nameOf = (s: Surveyor) => (nameDrafts[s.id] ?? s.name ?? "").trim();
        const isBlank = (s: Surveyor) => !s.isLead && nameOf(s) === "" && !s.locationId;
        const blank = surveyors.filter(isBlank);
        const remaining = surveyors.filter((s) => !isBlank(s));

        try {
            await Promise.all(blank.map((s) => service.removeSurveyor(s.id)));
            if (blank.length) console.log('Removed blank surveyors:', blank.map((s) => s.id));
            const saved = await Promise.all(remaining.map((s) => service.updateSurveyor(s.id, { name: nameOf(s) })));
            console.log('Surveyor names saved:', saved);

            goNext();
        } catch (e) {
            console.log("Error saving surveyors", e);
        }
    };

    const goNext = () => editing
        ? navigation.popTo('SurveyStatusScreen', { surveyId })
        : navigation.navigate('ReviewSurveyDetailsScreen', { surveyId });


    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <ScreenHeader navigation={navigation} />
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Title
                    title={editing ? "Edit Surveyors" : "Add Surveyors"}
                    subtitle={editing
                        ? "Names are saved when you press Save. Added surveyors, removals and locations are saved straight away."
                        : "Add the name and site location of each surveyor for this survey"}
                />
                <View style={styles.content} >
                    {surveyors.map((surveyor) => (
                        <SurveyorCard
                            key={surveyor.id}
                            isLead={isLead(surveyor)}
                            testID={isLead(surveyor) ? "lead-surveyor-name-input" : "surveyor-name-input"}
                            name={displayName(surveyor)}
                            onChangeName={(text) => updateName(surveyor.id, text)}
                            onAddLocation={() => openLocationSheet(surveyor.id)}
                            canAddLocation={!!boundaryImageUrl}
                            onLocationUnavailable={() => setShowBoundaryRequired(true)}
                            onClose={() => removeSurveyor(surveyor.id)}
                            hasLocation={surveyor.locationId != null}
                        />
                    ))}
                    <InlineButton label="Add More Surveyors" onPress={addSurveyor} />
                </View>
                <ButtonGroup
                    variant="mixed"
                    labels={editing ? ['Save', 'Cancel'] : ['Continue', 'Skip']}
                    disabled={[!canContinue, false]}
                    onPress={[
                        continueToReview,
                        // Drafts are discarded: Skip/Cancel never save.
                        goNext
                    ]}
                />
                <AddLocationBottomSheet
                    ref={sheetRef}
                    boundaryImageUri={boundaryImageUrl}
                    isEditing={activeSurveyor?.locationId != null}
                    initialPosition={activePosition}
                    onChange={saveLocation}
                />
            </ScrollView>
            <ConfirmModal
                visible={showBoundaryRequired}
                title="Red line boundary needed"
                message="Upload a red line boundary to add surveyor locations."
                confirmLabel="OK"
                onConfirm={() => setShowBoundaryRequired(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: {
        width: '100%',
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
    },
    content: {
        ...screen.content,
        flexGrow: 1,
        gap: 16,
        justifyContent: 'flex-start',
        paddingVertical: 24,
    }
})

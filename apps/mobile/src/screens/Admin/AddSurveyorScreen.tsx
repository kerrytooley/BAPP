import { BackButton, ButtonGroup, InlineButton } from "@components/Button";
import { SurveyorCard } from "@components/SurveyorCard";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import { ScrollView, StyleSheet, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSurveyService } from "@services/surveyServiceContext";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { BoundaryPosition, Location, Surveyor } from "@bapp/domain";
import { AddLocationBottomSheet } from "@components/AddLocationBottomSheet";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function AddSurveyorScreen(): React.JSX.Element {
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, 'AddSurveyorScreen'>>().params;
    const service = useSurveyService();
    const navigation = useNavigation<Nav>();

    const [surveyors, setSurveyors] = useState<Surveyor[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [activeSurveyorId, setActiveSurveyorId] = useState<string | null>(null);
    const [boundaryImageUrl, setBoundaryImageUrl] = useState<string | null>(null);
    const sheetRef = useRef<BottomSheetModal>(null);

    //retrieve data
    useEffect(() => {
        const load = async () => {
            const context = await service.getSurveyContext(surveyId);
            setLocations(context.locations);
            if (context.surveyors.length === 0) {
                const lead = await service.addSurveyor(surveyId, { name: "", isLead: true });
                setSurveyors([lead]);
            } else {
                setSurveyors(context.surveyors)
            }

        };
        load().catch((e) => console.error("Failed to load surveyors", e));
    }, [service, surveyId])

    useEffect(() => {
        service.getBoundaryImageUrl(surveyId)
            .then(setBoundaryImageUrl)
            .catch((e) => console.error("Failed to fetch boundary image", e));
    }, [service, surveyId]);


    // set selected surveyor when tapping between cards
    const activeSurveyor = surveyors.find((surveyor) => surveyor.id === activeSurveyorId);
    const activePosition = locations.find((location) => location.id === activeSurveyor?.locationId)?.boundaryPosition ?? null;

    const openLocationSheet = (surveyorId: string) => {
        setActiveSurveyorId(surveyorId);
        sheetRef.current?.present();
    };

    // add, remove and save actions
    const addSurveyor = async () => {
        const newSurveyor = await service.addSurveyor(surveyId, { name: "", isLead: false });
        console.log('Surveyor added:', newSurveyor);
        setSurveyors((prevSurveyorList) => [...prevSurveyorList, newSurveyor]);
    };

    const removeSurveyor = async (id: string) => {
        const locationId = surveyors.find((s) => s.id === id)?.locationId ?? null;
        await service.removeSurveyor(id);
        console.log('Surveyor removed:', id);
        setSurveyors((prevSurveyorList) => prevSurveyorList.filter((surveyor) => surveyor.id !== id));
        if (locationId) {
            try {
                await service.removeLocation(locationId);
                console.log('Surveyor location removed:', locationId);
                setLocations((prev) => prev.filter((location) => location.id !== locationId));
            } catch (e) {
                console.log("Error removing surveyor location", e);
            }
        }
    }

    const updateName = (id: string, name: string) => {
        setSurveyors((prev) => prev.map((surveyor) => (
            surveyor.id === id ? { ...surveyor, name } : surveyor
        )));
    }

    const saveName = (id: string, name: string) => service.updateSurveyor(id, { name })
        .then((surveyor) => console.log('Surveyor name saved:', surveyor))
        .catch((e) => console.log("Error saving surveyor name", e))

    const saveLocation = async (position: BoundaryPosition) => {
        const surveyor = surveyors.find((s) => s.id === activeSurveyorId);
        if (!surveyor) return;

        if (surveyor.locationId) {
            const updatedLocation = await service.updateLocation(surveyor.locationId, { boundaryPosition: position });
            console.log('Surveyor location updated:', updatedLocation);
            setLocations((prev) => prev.map((location) => (location.id === updatedLocation.id ? updatedLocation : location)));
        } else {
            const location = await service.addLocation(surveyId, { boundaryPosition: position });
            await service.updateSurveyor(surveyor.id, { locationId: location.id });
            console.log('Surveyor location saved:', location);
            setSurveyors((prev) => prev.map((s) => (s.id === surveyor.id ? { ...s, locationId: location.id } : s)));
            setLocations((prev) => [...prev, location]);
        }
        sheetRef.current?.dismiss();
    }


    // continue checks
    const isLead = (surveyor: Surveyor) => surveyor.isLead
    const leadSurveyor = surveyors.find((surveyor) => surveyor.isLead);
    const canContinue = (leadSurveyor?.name ?? "").trim().length > 0;

    const continueToReview = async () => {
        const isBlank = (s: Surveyor) => !s.isLead && (s.name ?? "").trim() === "" && !s.locationId;
        const blank = surveyors.filter(isBlank);
        const remaining = surveyors.filter((s) => !isBlank(s));
        try {
            await Promise.all(blank.map((s) => service.removeSurveyor(s.id)));
            if (blank.length) console.log('Removed blank surveyors:', blank.map((s) => s.id));
            const saved = await Promise.all(remaining.map((s) => service.updateSurveyor(s.id, { name: s.name ?? "" })));
            console.log('Surveyor names saved:', saved);
            setSurveyors(remaining);
        } catch (e) {
            console.log("Error saving surveyors", e);
        }
        navigation.navigate('ReviewSurveyDetailsScreen', { surveyId });
    };


    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Title title="Add Surveyors" subtitle="Add the name and site location of each surveyor for this survey" />
                <View style={styles.content} >
                    {surveyors.map((surveyor) => (
                        <SurveyorCard
                            key={surveyor.id}
                            isLead={isLead(surveyor)}
                            name={surveyor.name ?? ""}
                            onChangeName={(text) => updateName(surveyor.id, text)}
                            onEndEditingName={() => saveName(surveyor.id, surveyor.name ?? "")}
                            onAddLocation={() => openLocationSheet(surveyor.id)}
                            onClose={() => removeSurveyor(surveyor.id)}
                            hasLocation={surveyor.locationId != null}
                        />
                    ))}
                    <InlineButton label="Add More Surveyors" onPress={addSurveyor} />
                </View>
                <ButtonGroup
                    variant="mixed"
                    labels={['Continue', 'Skip']}
                    disabled={[!canContinue, false]}
                    onPress={[
                        continueToReview,
                        () => { navigation.navigate('ReviewSurveyDetailsScreen', { surveyId }) }
                    ]}
                />
                <AddLocationBottomSheet
                    ref={sheetRef}
                    boundaryImageRef={boundaryImageUrl}
                    isEditing={activeSurveyor?.locationId != null}
                    initialPosition={activePosition}
                    onChange={saveLocation}
                />
            </ScrollView>
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
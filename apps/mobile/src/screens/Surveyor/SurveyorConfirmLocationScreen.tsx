import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { screen } from "@theme/screen"
import { useEffect, useRef, useState } from "react";

import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { BoundaryPosition } from "@bapp/domain";

import { StyleSheet, View } from "react-native";
import { BackButton, ButtonGroup } from "@components/Button";
import { Title } from "@components/Titles";
import { StaticPinLayer } from "@components/StaticPinLayer";
import { AddLocationBottomSheet } from "@components/AddLocationBottomSheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function SurveyorConfirmLocationScreen(): React.JSX.Element {
    const { surveyId, surveyorId } = useRoute<RouteProp<SurveyorStackParamList, "SurveyorConfirmLocationScreen">>().params;
    const navigation = useNavigation<Nav>();
    const service = useSurveyService();
    const { context } = useActiveSurvey();

    const surveyor = context?.surveyors.find((surveyor) => surveyor.id === surveyorId);
    const locationId = surveyor?.locationId ?? "";
    const position = context?.locations.find((location) => location.id === surveyor?.locationId)?.boundaryPosition;

    const [boundaryImageUri, setBoundaryImageUri] = useState<string | null | undefined>();

    const sheetRef = useRef<BottomSheetModal>(null);

    useEffect(() => {
        const loadBoundaryImage = async () => {
            try {
                const boundaryImageResult = await service.getBoundaryImage(surveyId);
                if (boundaryImageResult.status === "ready") {
                    setBoundaryImageUri(boundaryImageResult.url);
                } else {
                    console.log(`Boundary image not available, status: ${boundaryImageResult.status}`);
                }
            } catch (e) {
                console.error("Error fetching boundary image", e);
            }
        }
        loadBoundaryImage();
    }, [service, surveyId]);

    const openLocationSheet = () => {
        sheetRef.current?.present();
    };
    const saveLocation = async (newPosition: BoundaryPosition) => {
        try {
            if (surveyor && surveyor.locationId) {
                const updatedLocation = await service.updateLocation(surveyor.locationId, { boundaryPosition: newPosition });
                console.log('Surveyor location updated:', updatedLocation);
            } else {
                const location = await service.addLocation(surveyId, { boundaryPosition: newPosition });
                await service.updateSurveyor(surveyorId, { locationId: location.id });
                console.log('Surveyor location saved:', location);
            }
        } catch (e) {
            console.error("Error saving surveyor location", e);
        } finally {
            sheetRef.current?.dismiss();
        }
    }

    const ensureLocationId = async (): Promise<string> => {
        if (locationId) return locationId;
        // No red line boundary for this site: create a placeholder location
        // (no boundary coordinates) so photos can still be attached to it.
        const location = await service.addLocation(surveyId, {});
        await service.updateSurveyor(surveyorId, { locationId: location.id });
        return location.id;
    };

    const handleContinue = async () => {
        try {
            const id = await ensureLocationId();
            let currentSurveyor = surveyor;
            if (!currentSurveyor) {
                const surveyContext = await service.getSurveyContext(surveyId);
                currentSurveyor = surveyContext.surveyors.find((s) => s.id === surveyorId);
            }
            if (currentSurveyor?.status === 'pending') {
                await service.updateSurveyor(surveyorId, { status: 'ready' });
            }
            navigation.navigate("CapturePhotoScreen", { surveyId, locationId: id, surveyorId, photoType: 'frontView' });
        } catch (e) {
            console.error("Unable to continue to photo capture", e);
        }
    };

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }} >
                <BackButton navigation={navigation} />
                <Title title="Confirm Location" subtitle="Confirm your location is correct on the map" />
            </View>
            <View style={[screen.content, styles.imageArea]}>
                {boundaryImageUri &&
                    <StaticPinLayer imageUri={boundaryImageUri} values={position ? [position] : []} style={styles.pinLayer} />
                }
            </View>
            <ButtonGroup labels={["Continue", "Change Location"]}
                variant="mixed"
                onPress={[() => handleContinue(), () => openLocationSheet()]}
            />
            <AddLocationBottomSheet
                ref={sheetRef}
                boundaryImageUri={boundaryImageUri}
                isEditing={surveyor?.locationId != null}
                initialPosition={position}
                onChange={saveLocation}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    imageArea: {
        flex: 1,
        minHeight: 0,
        justifyContent: "center",
        paddingVertical: 24,
    },
    pinLayer: {
        maxHeight: "100%",
    },
});

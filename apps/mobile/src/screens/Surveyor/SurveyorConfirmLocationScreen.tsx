import { useSurveyService } from "@services/surveyServiceContext";
import { screen } from "@theme/screen"
import { useEffect, useRef, useState } from "react";

import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { BoundaryPosition, Surveyor } from "@bapp/domain";

import { View } from "react-native";
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

    const [surveyor, setSurveyor] = useState<Surveyor>();
    const [locationId, setLocationId] = useState<string>("");
    const [boundaryImageUri, setBoundaryImageUri] = useState<string | null | undefined>();
    const [position, setPosition] = useState<BoundaryPosition | null | undefined>();

    const sheetRef = useRef<BottomSheetModal>(null);

    useEffect(() => {
        const loadSurvey = async () => {
            try {
                const surveyContext = await service.getSurveyContext(surveyId);
                const surveyor = surveyContext.surveyors.find((surveyor) => surveyor.id === surveyorId);
                if (surveyor) {
                    setSurveyor(surveyor);
                    setLocationId(surveyor.locationId ?? "");
                }
                const location = surveyContext.locations.find((location) => location.id === surveyor?.locationId);
                setPosition(location?.boundaryPosition);
            } catch (e) {
                console.error("Error fetching survey context", e);
            }
        };
        loadSurvey();
    }, [service, surveyId, surveyorId]);

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
        if (surveyor && surveyor.locationId) {
            const updatedLocation = await service.updateLocation(surveyor.locationId, { boundaryPosition: newPosition });
            console.log('Surveyor location updated:', updatedLocation);
            setPosition(newPosition);
        } else {
            const location = await service.addLocation(surveyId, { boundaryPosition: newPosition });
            await service.updateSurveyor(surveyorId, { locationId: location.id });
            setSurveyor((prev) => (prev ? { ...prev, locationId: location.id } : prev));
            setLocationId(location.id);
            console.log('Surveyor location saved:', location);
            setPosition(newPosition);
        }
        sheetRef.current?.dismiss();
    }

    const ensureLocationId = async (): Promise<string> => {
        if (locationId) return locationId;
        // No red line boundary for this site: create a placeholder location
        // (no boundary coordinates) so photos can still be attached to it.
        const location = await service.addLocation(surveyId, {});
        await service.updateSurveyor(surveyorId, { locationId: location.id });
        setSurveyor((prev) => (prev ? { ...prev, locationId: location.id } : prev));
        setLocationId(location.id);
        return location.id;
    };

    const handleContinue = async () => {
        try {
            const id = await ensureLocationId();
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
            <View style={screen.content}>
                {boundaryImageUri &&
                    <StaticPinLayer imageUri={boundaryImageUri} value={position} />
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


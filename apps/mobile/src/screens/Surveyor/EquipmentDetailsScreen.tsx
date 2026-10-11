import { ScreenHeader } from "@components/Common/ScreenHeader";
import { ButtonGroup } from "@components/Common/Button";
import { InputField } from "@components/Common/InputField";
import { Title } from "@components/Common/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSurveyService } from "@services/surveyServiceContext";
import { continueResumedSetup } from "@services/setupResume";
import { EquipmentInformation, isBlank } from "@bapp/domain";


type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function EquipmentDetailsScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId, mode } = useRoute<RouteProp<SurveyorStackParamList, "EquipmentDetailsScreen">>().params;
    const service = useSurveyService();

    const [audioEquipmentLabel, setAudioEquipmentLabel] = useState<string>();
    const [videoEquipmentLabel, setVideoEquipmentLabel] = useState<string>();
    const [otherEquipmentInfo, setOtherEquipmentInfo] = useState<string>();

    const isSubmitting = useRef(false);

    // Returning to this step (resume/edit) shows what was saved before.
    useEffect(() => {
        if (!mode) return;
        let cancelled = false;
        service.getSurveyContext(surveyId)
            .then(({ locations }) => {
                const saved = locations.find((l) => l.id === locationId)?.equipmentInformation;
                if (cancelled || !saved) return;
                setAudioEquipmentLabel(saved.audioLabel);
                setVideoEquipmentLabel(saved.videoLabel);
                setOtherEquipmentInfo(saved.otherInfo);
            })
            .catch((e) => console.error('Failed to load saved equipment details', e));
        return () => { cancelled = true; };
    }, [mode, service, surveyId, locationId]);

    const equipmentInformation: EquipmentInformation = {
        audioLabel: audioEquipmentLabel?.trim() ?? "",
        videoLabel: videoEquipmentLabel?.trim() ?? "",
        otherInfo: otherEquipmentInfo?.trim() ?? "",
    };
    const hasInput = Object.values(equipmentInformation).some((value) => !isBlank(value));

    const goNext = async () => {
        if (mode === "edit") {
            navigation.goBack();
            return;
        }
        if (mode === "resume") {
            try {
                await continueResumedSetup(service, navigation, surveyId, surveyorId, "equipmentDetails");
            } catch (e) {
                console.error('Unable to continue setup', e);
            }
            return;
        }
        navigation.navigate('SetupCompleteScreen', { surveyId, locationId, surveyorId });
    };

    const handleContinue = async () => {
        if (isSubmitting.current || !hasInput) return;
        isSubmitting.current = true;
        try {
            await service.updateLocation(locationId, { equipmentInformation: equipmentInformation });
            console.log('Location updated with equipment information: ', equipmentInformation);
            await goNext();
        } catch (e) {
            console.error('Failed to save equipment information', e);
        } finally {
            isSubmitting.current = false;
        }
    }

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <ScreenHeader navigation={navigation} />
                <Title title="Add Equipment Details" subtitle="Tell your survey admin which equipment you are using at your location." />
            </View>
            <View style={styles.content} >
                <InputField testID="audio-equipment-input" value={audioEquipmentLabel} fieldLabel="Audio Equipment Label" placeholderText="Input audio equipment label" onChangeText={setAudioEquipmentLabel} />
                <InputField testID="video-equipment-input" value={videoEquipmentLabel} fieldLabel="Video Equipment Label" placeholderText="Input video equipment label" onChangeText={setVideoEquipmentLabel} />
                <InputField testID="other-equipment-input" value={otherEquipmentInfo} fieldLabel="Other Equipment Information" placeholderText="Input any other equipment info" size="large" onChangeText={setOtherEquipmentInfo} />
            </View>
            <ButtonGroup
                variant="mixed"
                labels={mode === "edit" ? ["Save", "Cancel"] : ["Continue", "Skip"]}
                disabled={[!hasInput, false]}
                onPress={[handleContinue, mode === "edit" ? () => navigation.goBack() : goNext]}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    content: {
        ...screen.content,
        justifyContent: "flex-start",
        flex: 1,
        paddingTop: 16
    }
})
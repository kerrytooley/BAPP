import { BackButton, Button } from "@components/Common/Button";
import { InputField } from "@components/Common/InputField";
import { Title } from "@components/Common/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSurveyService } from "@services/surveyServiceContext";
import { EquipmentInformation } from "@bapp/domain";


type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function EquipmentDetailsScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId } = useRoute<RouteProp<SurveyorStackParamList, "EquipmentDetailsScreen">>().params;
    const service = useSurveyService();

    const [audioEquipmentLabel, setAudioEquipmentLabel] = useState<string>();
    const [videoEquipmentLabel, setVideoEquipmentLabel] = useState<string>();
    const [otherEquipmentInfo, setOtherEquipmentInfo] = useState<string>();

    const isSubmitting = useRef(false);


    const handleContinue = async () => {
        if (isSubmitting.current) return;
        isSubmitting.current = true;
        const equipmentInformation = {
            audioLabel: audioEquipmentLabel,
            videoLabel: videoEquipmentLabel,
            otherInfo: otherEquipmentInfo
        } as EquipmentInformation
        try {
            await service.updateLocation(locationId, { equipmentInformation: equipmentInformation });
            console.log('Location updated with equipment information: ', equipmentInformation);
            navigation.navigate('SetupCompleteScreen', { surveyId, locationId, surveyorId });
        } catch (e) {
            console.error('Failed to save equipment information', e);
        } finally {
            isSubmitting.current = false;
        }
    }

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
                <Title title="Add Equipment Details" subtitle="Tell your survey admin which equipment you are using at your location." />
            </View>
            <View style={styles.content} >
                <InputField testID="audio-equipment-input" value={audioEquipmentLabel} fieldLabel="Audio Equipment Label" placeholderText="Input audio equipment label" onChangeText={setAudioEquipmentLabel} />
                <InputField testID="video-equipment-input" value={videoEquipmentLabel} fieldLabel="Video Equipment Label" placeholderText="Input video equipment label" onChangeText={setVideoEquipmentLabel} />
                <InputField testID="other-equipment-input" value={otherEquipmentInfo} fieldLabel="Other Equipment Information" placeholderText="Input any other equipment info" size="large" onChangeText={setOtherEquipmentInfo} />
            </View>
            <Button label="Continue" variant="light" onPress={() => handleContinue()} />
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
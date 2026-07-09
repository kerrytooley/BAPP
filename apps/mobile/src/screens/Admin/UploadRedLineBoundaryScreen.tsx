import { BackButton, ButtonGroup } from "@components/Button";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen"
import React, { useState } from "react"
import { View, StyleSheet } from "react-native"
import { useSurveyService } from "@services/surveyServiceContext";
import { Title } from "@components/Titles";
import { DocumentUpload } from "@components/DocumentUpload";
import * as FileSystem from "expo-file-system";
import { base64ToBytes } from "@utils/base64";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function UploadRedLineBoundaryScreen(): React.JSX.Element {
    const service = useSurveyService();
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, 'UploadRedLineBoundaryScreen'>>().params;
    const navigation = useNavigation<Nav>();
    const [imageUri, setImageUri] = useState<string | undefined>();

    const handleContinue = async () => {
        try {
            if (imageUri) {
                const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
                const bytes = base64ToBytes(base64);
                const fileName = imageUri?.split("/").pop() ?? `boundary-${Date.now()}.jpg`;
                await service.setBoundaryImage(surveyId, fileName, bytes);
                console.log('Red line boundary uploaded:', fileName);
            }
            navigation.navigate('AddSurveyorScreen', { surveyId })
        } catch (e) {
            console.log("Error uploading red line boundary: ", e)
        }
    };

    const handleSkip = async () => {
        console.log('Skipped red line boundary upload');
        navigation.navigate('AddSurveyorScreen', { surveyId })
    }

    return (
        <View style={screen.justifyScreen}>
            <View>
                <BackButton navigation={navigation} />
                <Title title="Upload Red Line Boundary" subtitle="Upload an image of the red line boundary of the property" />
            </View>
            <View style={styles.content} >
                <DocumentUpload value={imageUri} onChange={setImageUri} />
            </View>
            <ButtonGroup labels={["Continue", "Skip"]}
                onPress={[handleContinue, handleSkip]}
                disabled={imageUri ? [false, false] : [true, false]}
                variant={"mixed"} />
        </View>
    )
}

const styles = StyleSheet.create({
    content: {
        ...screen.content,
        flex: 1,
        gap: 24,
        justifyContent: "center"
    }

})
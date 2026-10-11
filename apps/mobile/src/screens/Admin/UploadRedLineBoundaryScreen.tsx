import { ScreenHeader } from "@components/Common/ScreenHeader";
import { ButtonGroup } from "@components/Common/Button";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen"
import React, { useEffect, useRef, useState } from "react"
import { View, StyleSheet } from "react-native"
import { useSurveyService } from "@services/surveyServiceContext";
import { Title } from "@components/Common/Titles";
import { DocumentUpload } from "@components/Interactive/DocumentUpload";
import { createImageBody } from "@utils/image";
import { ConfirmModal } from "@components/Modals/ConfirmModal";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function UploadRedLineBoundaryScreen(): React.JSX.Element {
    const service = useSurveyService();
    const { surveyId, editing = false } = useRoute<RouteProp<AdminStackParamList, 'UploadRedLineBoundaryScreen'>>().params;
    const navigation = useNavigation<Nav>();
    const [imageUri, setImageUri] = useState<string | undefined>();
    const [existingUri, setExistingUri] = useState<string | undefined>();
    const [uploadFailed, setUploadFailed] = useState(false);
    const isSubmitting = useRef(false);

    useEffect(() => {
        if (!editing) return;
        service.getBoundaryImage(surveyId)
            .then((result) => { if (result.status === 'ready') setExistingUri(result.url); })
            .catch((e) => console.error("Failed to fetch boundary image", e));
    }, [editing, service, surveyId]);

    const goNext = () => editing
        ? navigation.popTo('SurveyStatusScreen', { surveyId })
        : navigation.navigate('AddSurveyorScreen', { surveyId });

    const handleContinue = async () => {
        if (isSubmitting.current) return;
        isSubmitting.current = true;
        try {
            // Continue is only enabled once an image has been selected.
            const imageBody = await createImageBody(imageUri as string);
            await service.setBoundaryImage(surveyId, imageBody.fileName, imageBody.bytes);
            console.log('Red line boundary uploaded:', imageBody.fileName);
            goNext();
        } catch (e) {
            console.log("Error uploading red line boundary: ", e)
            setUploadFailed(true);
        } finally {
            isSubmitting.current = false;
        }
    };

    const handleSkip = async () => {
        console.log('Skipped red line boundary upload');
        goNext();
    }

    return (
        <View style={screen.justifyScreen}>
            <View>
                <ScreenHeader navigation={navigation} />
                <Title title={editing ? "Edit Red Line Boundary" : "Upload Red Line Boundary"} subtitle="Upload an image of the red line boundary of the property" />
            </View>
            <View style={styles.content} >
                <DocumentUpload value={imageUri ?? existingUri} onChange={setImageUri} />
            </View>
            <ButtonGroup labels={editing ? ["Save", "Cancel"] : ["Continue", "Skip"]}
                onPress={[handleContinue, handleSkip]}
                disabled={imageUri ? [false, false] : [true, false]}
                variant={"mixed"} />
            <ConfirmModal
                visible={uploadFailed}
                title="Upload failed"
                message="We couldn't save your red line boundary. Please try again or choose a different image."
                confirmLabel="OK"
                onConfirm={() => setUploadFailed(false)}
            />
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
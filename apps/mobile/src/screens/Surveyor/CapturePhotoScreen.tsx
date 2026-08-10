import { BackButton, Button } from "@components/Button";
import { Title } from "@components/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colours } from "@theme/colours";
import { screen } from "@theme/screen";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import { Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { textStyles } from "@theme/fonts";
import Rotate from "@assets/icons/rotate.svg"
import { useSurveyService } from "@services/surveyServiceContext";
import { createImageBody, getAspectRatio } from "@utils/image";

interface PageTitleProps {
    title: string,
    subtitle: string,
    exampleImage: ImageSourcePropType
}

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function CapturePhotoScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId, photoType } = useRoute<RouteProp<SurveyorStackParamList, 'CapturePhotoScreen'>>().params;
    const service = useSurveyService();

    const [pageTitles, setPageTitles] = useState<PageTitleProps>();
    const [imageUri, setImageUri] = useState<string>();
    const [aspectRatio, setAspectRatio] = useState<number>();

    useEffect(() => {
        const getPageType = () => {
            if (photoType === 'EQUIPMENT') {
                setPageTitles({
                    title: 'Equipment Setup',
                    subtitle: 'Take a landscape photo of your equipment setup at your survey location.',
                    exampleImage: require("@assets/images/surveyorPhotos/EquipmentView.png"),

                } as PageTitleProps)
            } else {
                setPageTitles({
                    title: 'Front View of Property',
                    subtitle: 'Take a landscape photo of the property from your survey location.',
                    exampleImage: require("@assets/images/surveyorPhotos/FrontView.png")
                } as PageTitleProps)
            }

        }
        getPageType();
    }, [photoType])

    useEffect(() => {
        if (!imageUri) return;
        getAspectRatio(imageUri).then((ratio) =>
            setAspectRatio(Math.max(ratio, 1)));
    }, [imageUri])

    const launchCamera = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return;

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            console.log('Image captured: ', result.assets[0].uri);
        }
    }

    const saveAndContinue = async () => {
        console.log('saveImage called with uri:', imageUri);
        try {
            const imageBody = await createImageBody(imageUri as string);
            const updatedLocation = await service.setLocationsImage(locationId, imageBody.fileName, imageBody.bytes, photoType);
            console.log('Image saved for ', pageTitles?.title, updatedLocation)

            if (photoType === 'FRONT_VIEW') {
                navigation.push('CapturePhotoScreen', { surveyId, locationId, surveyorId, photoType: 'EQUIPMENT' })
            } else {
                navigation.navigate('SetupCompleteScreen', { surveyId, locationId, surveyorId });
            }

        } catch (error) {
            console.error('saveImage failed:', error);
        }
    }

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }} >
                <BackButton navigation={navigation} />
                {pageTitles && <Title title={pageTitles.title} subtitle={pageTitles.subtitle} />}
            </View>
            <View style={[screen.content, { gap: 48 }]} >
                <View style={[styles.imageLayer, { aspectRatio: aspectRatio ?? 1.5 }]} >
                    <Image source={imageUri ? { uri: imageUri } : pageTitles?.exampleImage} style={styles.image} resizeMode="cover" />
                </View>
                <View style={styles.rotatePrompt}>
                    <Text style={[textStyles.subtitle, { color: colours.placeholderText }]}>Rotate your device</Text>
                    <Rotate width={24} />
                </View>
            </View>
            <Button label="Take Photo" variant="light" onPress={() => launchCamera()} />
            {imageUri &&
                <Button label="Save photo and continue" onPress={() => saveAndContinue()} />
            }
        </View>
    )
}

const styles = StyleSheet.create({
    imageLayer: {
        borderRadius: 24,
        width: "100%",
        overflow: "hidden",
    },
    image: {
        width: "100%",
        height: "100%",
        opacity: 0.8,
    },
    rotatePrompt: {
        alignItems: "center"
    }
})
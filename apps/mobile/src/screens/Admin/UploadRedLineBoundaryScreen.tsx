import { BackButton, Button } from "@components/Button";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen"
import React from "react"
import { View, Text } from "react-native"
import { useSurveyService } from "@services/surveyServiceContext";
import { Title } from "@components/Titles";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function UploadRedLineBoundaryScreen(): React.JSX.Element {
    const service = useSurveyService();
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, 'UploadRedLineBoundaryScreen'>>().params;
    const navigation = useNavigation<Nav>();

    return (
        //TODO: implement uploading a photo and storing it to the media repo
        <View style={screen.justifyScreen}>
            <BackButton navigation={navigation} />
            <View style={screen.content} >
                <Title title="Upload Red Line Boundary" subtitle="Upload an image of the red line boundary of the property" />
                <Text style={{ color: "white" }}>TODO: Implement this</Text>
            </View>
            <Button label="Continue" variant='light' onPress={() => {
                navigation.navigate('AddSurveyorScreen', { surveyId })
            }} />
        </View>
    )
}
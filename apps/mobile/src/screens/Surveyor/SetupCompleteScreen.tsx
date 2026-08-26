import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { View } from "react-native";
import { screen } from "@theme/screen";
import { BackButton, Button } from "@components/Button";
import { Title } from "@components/Titles";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function SetupCompleteScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId } = useRoute<RouteProp<SurveyorStackParamList, 'SetupCompleteScreen'>>().params;


    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }} >
                <BackButton navigation={navigation} />
            </View>
            <View style={screen.content} >
                <Title title="Survey Setup Complete!" />
            </View>
            <Button label="Next" onPress={() => navigation.navigate("SurveyScreen", { surveyId, locationId, surveyorId })} />
        </View>
    )
}
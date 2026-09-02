import { BackButton, Button } from "@components/Button";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import React from "react";
import { ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { WelcomeWalkthrough } from "@components/WelcomeWalkthrough";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function WelcomeWalkthroughScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
                <Title title="How it works!" />
            </View>
            <ScrollView style={screen.scroll} contentContainerStyle={screen.content}>
                <WelcomeWalkthrough />
            </ScrollView>
            <Button variant="light" label="Let's get started" onPress={() => navigation.navigate('CreateSurvey')} />
        </View>
    );
}
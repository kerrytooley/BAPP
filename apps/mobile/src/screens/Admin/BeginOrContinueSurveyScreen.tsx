import { BackButton, ButtonGroup } from "@components/Button";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function BeginOrContinueSurveyScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();

    return (
        <View style={screen.justifyScreen}>
            <View>
                <BackButton navigation={navigation} />
                <Title title="Begin or continue a survey" subtitle="Start a new survey or pick up where you left with an existing one" />
            </View>
            <View style={styles.content}>
                <ButtonGroup
                    labels={['Begin a new survey', 'Continue existing survey']}
                    variant="mixed"
                    onPress={[
                        () => {
                            navigation.navigate('WelcomeWalkthroughScreen');
                        },
                        () => {
                            navigation.navigate('AdminCodeScreen');
                        },
                    ]} />
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.baseScreen,
    },
    content: {
        ...screen.content,
        position: "absolute",
        top: "50%"
    }
})
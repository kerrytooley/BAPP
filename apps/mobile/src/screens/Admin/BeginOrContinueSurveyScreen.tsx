import { ScreenHeader } from "@components/Common/ScreenHeader";
import { ButtonGroup } from "@components/Common/Button";
import { Title } from "@components/Common/Titles";
import { screen } from "@theme/screen";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import ClipboardIllustration from "@assets/illustrations/clipboard.svg"

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function BeginOrContinueSurveyScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();

    return (
        <View style={screen.justifyScreen}>
            <View >
                <ScreenHeader navigation={navigation} />
                <View style={styles.content}>
                    <ClipboardIllustration width={180} height={180} style={styles.illustration} />
                    <Title title="Begin or continue a survey" subtitle="Start a new survey or pick up where you left with an existing one" />
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
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.baseScreen,
    },
    illustration: {
        alignSelf: "center"
    },
    content: {
        ...screen.content,
        width: "100%",
        gap: 48,
        paddingVertical: 48
    }
})
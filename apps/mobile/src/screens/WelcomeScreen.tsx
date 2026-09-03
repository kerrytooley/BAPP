import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Logo from "@assets/illustrations/logo.svg"
import { textStyles } from '@theme/fonts';
import { colours } from '@theme/colours';
import { ButtonGroup } from "@components/Button";
import { screen } from "@theme/screen";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@navigators/index";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function WelcomeScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    return (
        <View style={styles.welcomeScreen}>
            <View >
                <Logo width={150} />
            </View>
            <ButtonGroup variant="dark"
                labels={[
                    'Join as Survey Admin',
                    'Join as Surveyor']}
                onPress={[
                    () => navigation.navigate('Admin'),
                    () => navigation.navigate('Surveyor')
                ]}
            />
            <Text style={styles.bappLogo}>BAPP</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    welcomeScreen: {
        ...screen.baseScreen,


    },
    bappLogo: {
        ...textStyles.bappLogo,
        position: 'absolute',
        bottom: 40,
        color: colours.light,
        textAlign: "center"
    }
})
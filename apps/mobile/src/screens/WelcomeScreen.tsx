import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Logo from "@assets/images/logo.svg"
import { textStyles } from '@theme/fonts';
import { colours } from '@theme/colours';
import { ButtonGroup } from "@components/Button";

export function WelcomeScreen(): React.JSX.Element {
    return (
        <View style={styles.welcomeScreen}>
            <View style={{ paddingRight: 24 }}>
                <Logo width={180} height={130} />
            </View>
            <ButtonGroup variant="dark"
                labels={[
                    'Join as Survey Admin',
                    'Join as Surveyor']}
            />
            <Text style={styles.bappLogo}>BAPP</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    welcomeScreen: {
        backgroundColor: colours.dark,
        alignItems: 'center',
        gap: 120,
        width: '100%',
        height: '100%',
        paddingTop: 200
    },
    bappLogo: {
        ...textStyles.bappLogo,
        position: 'absolute',
        bottom: 40,
        color: colours.light,
        textAlign: "center"
    }
})
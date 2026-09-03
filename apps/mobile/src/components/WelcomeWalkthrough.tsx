import { colours } from '@theme/colours';
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { textStyles } from '@theme/fonts';

export const WelcomeWalkthrough = () => {
    return (
        <View style={styles.area}>
            <Segment header="📝 create your survey" text="Add the name, postcode, date and start time." />
            <Segment header="🔑 grab your admin code" text="Your golden ticket to edit and collect results anytime." />
            <Segment header="🗺️ upload a red line boundary" text="An overhead shot your surveyors trace flight paths on." />
            <Segment header="📍 add your surveyors" text="Pin each one to the boundary. Move them later, no stress." />
            <Segment header="🌙 on the day" text="Surveyors check in with a survey code, log the weather, and snap site photos." />
            <Segment header="🦇 survey begins!" text="Live at start time. Capture observations and flight paths." />
            <Segment isLast header="📥 collect your results" text="Enter your admin code and download straight to your device." />
        </View>
    );
}


const Circle = () => {
    return (
        <View style={styles.circle} />
    )
}

const Join = () => {
    return (
        <View style={styles.join} />
    )
}

interface SegmentProps {
    header: string;
    text: string;
    isLast?: boolean;
}

const Segment = ({ header, text, isLast = false, }: SegmentProps) => {
    return (
        <View style={styles.row}>
            <View style={styles.column}>
                <Circle />
                {!isLast &&
                    <Join />
                }
            </View>
            <View style={{ flex: 1, paddingRight: 4 }}>
                <Text style={styles.header}>{header}</Text>
                <Text style={styles.text}>{text}</Text>
            </View>
        </View>


    )
}

const styles = StyleSheet.create({
    circle: {
        width: 24,
        height: 24,
        borderRadius: 16,
        borderColor: colours.light,
        borderWidth: 2
    },
    join: {
        width: 1,
        height: 64,
        borderColor: colours.light,
        borderWidth: 1,
        alignSelf: "center",
    },
    row: {
        width: "100%",
        justifyContent: 'flex-start',
        flexDirection: 'row',
        gap: 16,
    },
    column: {
        justifyContent: "flex-start",
    },
    segment: {
        width: "100%",
        justifyContent: "flex-start",
        flexDirection: "column"
    },
    area: {
        width: "100%"
    },
    header: {
        ...textStyles.inputTitleText,
        color: colours.light
    },
    text: {
        ...textStyles.inputText,
        color: colours.light,
        paddingLeft: 16
    }
})
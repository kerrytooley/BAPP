import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Logo from "@assets/illustrations/logo.svg"
import { textStyles } from '@theme/fonts';
import { colours } from '@theme/colours';
import { ButtonGroup } from "@components/Common/Button";
import { Menu } from "@components/Common/Icons";
import { RecentSurveysPanel } from "@components/Navigation/RecentSurveysPanel";
import { screen } from "@theme/screen";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@navigators/index";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSurveyService } from "@services/surveyServiceContext";
import { forgetRecentSurvey, recordRecentSurvey, type RecentSurvey } from "@services/recentSurveys";
import { useRecentSurveys } from "../hooks/useRecentSurveys";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function WelcomeScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const service = useSurveyService();
    const insets = useSafeAreaInsets();
    const { surveys, refresh } = useRecentSurveys();
    const [menuOpen, setMenuOpen] = useState(false);
    const [opening, setOpening] = useState<RecentSurvey | null>(null);
    const [failed, setFailed] = useState<RecentSurvey | null>(null);

    const closeMenu = () => {
        setMenuOpen(false);
        setFailed(null);
    };

    const openSurvey = async (entry: RecentSurvey) => {
        setFailed(null);
        setOpening(entry);
        try {
            const context = await service.getSurveyContext(entry.surveyId);
            void recordRecentSurvey(context.survey, entry.role, entry.surveyorId);
            closeMenu();
            if (entry.role === "admin") {
                navigation.navigate("Admin", { screen: "SurveyStatusScreen", params: { surveyId: entry.surveyId } });
                return;
            }
            const surveyor = context.surveyors.find((s) => s.id === entry.surveyorId);
            navigation.navigate("Surveyor", {
                screen: "CodeConfirmationScreen",
                params: { surveyId: entry.surveyId, returning: true, surveyorId: surveyor?.id },
            });
        } catch (e) {
            console.error("Failed to open recent survey", e);
            setFailed(entry);
        } finally {
            setOpening(null);
        }
    };

    const removeSurvey = async (entry: RecentSurvey) => {
        await forgetRecentSurvey(entry.surveyId, entry.role);
        if (failed?.surveyId === entry.surveyId && failed.role === entry.role) setFailed(null);
        await refresh();
    };

    return (
        <View style={styles.welcomeScreen}>
            <TouchableOpacity
                style={[styles.menuButton, { top: insets.top + 16 }]}
                accessibilityRole="button"
                accessibilityLabel="Recent surveys"
                hitSlop={12}
                onPress={() => setMenuOpen(true)}
            >
                <Menu />
            </TouchableOpacity>
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
            <RecentSurveysPanel
                visible={menuOpen}
                surveys={surveys}
                opening={opening}
                failed={failed}
                onClose={closeMenu}
                onOpen={openSurvey}
                onRemove={removeSurvey}
                onDismissFailure={() => setFailed(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    welcomeScreen: {
        ...screen.baseScreen,


    },
    menuButton: {
        position: "absolute",
        right: 16,
        zIndex: 1,
    },
    bappLogo: {
        ...textStyles.bappLogo,
        position: 'absolute',
        bottom: 40,
        color: colours.light,
        textAlign: "center"
    }
})
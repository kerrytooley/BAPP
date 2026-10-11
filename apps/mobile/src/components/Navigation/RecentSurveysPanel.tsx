import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colours } from "@theme/colours";
import { fonts, textStyles } from "@theme/fonts";
import { Close } from "@components/Common/Icons";
import { Button } from "@components/Common/Button";
import { ConfirmDialog } from "@components/Modals/ConfirmModal";
import { SwipeToDeleteRow } from "@components/Observation/SwipeToDeleteRow";
import type { RecentRole, RecentSurvey } from "@services/recentSurveys";

const PANEL_WIDTH = 320;
const PAGE_SIZE = 10;

export interface RecentSurveysPanelProps {
    visible: boolean;
    surveys: RecentSurvey[];
    /** Entry currently being opened (shows a spinner and blocks other taps). */
    opening?: RecentSurvey | null;
    /** Entry that failed to open, with remove/keep choices shown inline. */
    failed?: RecentSurvey | null;
    onClose: () => void;
    onOpen: (survey: RecentSurvey) => void;
    onRemove: (survey: RecentSurvey) => void;
    onDismissFailure: () => void;
}

export const surveyLabel = (survey: RecentSurvey) =>
    [survey.name?.trim() || "Untitled survey", survey.postcode?.trim()].filter(Boolean).join(" - ");

export const RecentSurveysPanel = ({
    visible, surveys, opening, failed, onClose, onOpen, onRemove, onDismissFailure,
}: RecentSurveysPanelProps) => {
    const insets = useSafeAreaInsets();
    const slide = useRef(new Animated.Value(PANEL_WIDTH)).current;
    const [mounted, setMounted] = useState(visible);
    const [confirmRemove, setConfirmRemove] = useState<RecentSurvey | null>(null);

    useEffect(() => {
        if (visible) {
            setMounted(true);
            Animated.timing(slide, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        } else {
            setConfirmRemove(null);
            Animated.timing(slide, { toValue: PANEL_WIDTH, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true })
                .start(({ finished }) => finished && setMounted(false));
        }
    }, [visible, slide]);

    const backdropOpacity = slide.interpolate({ inputRange: [0, PANEL_WIDTH], outputRange: [1, 0] });

    return (
        <Modal visible={mounted} transparent animationType="none" onRequestClose={confirmRemove ? () => setConfirmRemove(null) : onClose}>
            {/* Gestures inside a Modal need their own root on Android. */}
            <GestureHandlerRootView style={styles.root}>
                <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable testID="recent-surveys-backdrop" style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>
                <Animated.View style={[styles.panel, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, transform: [{ translateX: slide }] }]}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>Your recent surveys</Text>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close recent surveys" hitSlop={12} onPress={onClose}>
                            <Close width={22} />
                        </TouchableOpacity>
                    </View>
                    {failed &&
                        <View style={styles.failure} accessibilityRole="alert">
                            <Text style={styles.failureText}>
                                {`We couldn't open ${surveyLabel(failed)}. It may have expired or been deleted, or you may be offline.`}
                            </Text>
                            <Button size="medium" variant="light" label="Remove from list" onPress={() => onRemove(failed)} />
                            <Button size="medium" label="Keep" onPress={onDismissFailure} />
                        </View>
                    }
                    <ScrollView contentContainerStyle={styles.sections}>
                        {surveys.length === 0
                            ? <Text style={styles.empty}>Surveys you create or join will appear here.</Text>
                            : (["admin", "surveyor"] as RecentRole[]).map((role) => (
                                <RecentSection
                                    key={role}
                                    title={role === "admin" ? "Admin" : "Surveyor"}
                                    surveys={surveys.filter((s) => s.role === role)}
                                    opening={opening ?? null}
                                    onOpen={onOpen}
                                    onRemove={setConfirmRemove}
                                />
                            ))
                        }
                    </ScrollView>
                    {surveys.length > 0 && <Text style={styles.hint}>Swipe left on a survey to remove it.</Text>}
                </Animated.View>
                {confirmRemove &&
                    <View style={StyleSheet.absoluteFill}>
                        <ConfirmDialog
                            title="Remove from recent surveys?"
                            message={`${surveyLabel(confirmRemove)} will be removed from this list. The survey itself isn't deleted.`}
                            confirmLabel="Remove"
                            destructive
                            onConfirm={() => {
                                onRemove(confirmRemove);
                                setConfirmRemove(null);
                            }}
                            onCancel={() => setConfirmRemove(null)}
                        />
                    </View>
                }
            </GestureHandlerRootView>
        </Modal>
    );
};

interface RecentSectionProps {
    title: string;
    surveys: RecentSurvey[];
    opening: RecentSurvey | null;
    onOpen: (survey: RecentSurvey) => void;
    onRemove: (survey: RecentSurvey) => void;
}

const RecentSection = ({ title, surveys, opening, onOpen, onRemove }: RecentSectionProps) => {
    const [expanded, setExpanded] = useState(false);
    if (surveys.length === 0) return null;
    const shown = expanded ? surveys : surveys.slice(0, PAGE_SIZE);

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {shown.map((survey) => {
                const label = surveyLabel(survey);
                const isOpening = opening?.surveyId === survey.surveyId && opening.role === survey.role;
                return (
                    <SwipeToDeleteRow
                        key={`${survey.role}-${survey.surveyId}`}
                        style={styles.swipe}
                        deleteAccessibilityLabel={`Remove ${label}`}
                        onDelete={() => onRemove(survey)}
                    >
                        <View style={styles.row}>
                            <TouchableOpacity
                                style={styles.rowButton}
                                accessibilityRole="button"
                                accessibilityLabel={`Open ${label}`}
                                disabled={!!opening}
                                onPress={() => onOpen(survey)}
                            >
                                <Text style={styles.rowText} numberOfLines={2}>{label}</Text>
                            </TouchableOpacity>
                            {isOpening && <ActivityIndicator color={colours.light} />}
                        </View>
                    </SwipeToDeleteRow>
                );
            })}
            {surveys.length > PAGE_SIZE &&
                <TouchableOpacity accessibilityRole="button" onPress={() => setExpanded((e) => !e)}>
                    <Text style={styles.more}>{expanded ? "Show less" : `See more (${surveys.length - PAGE_SIZE})`}</Text>
                </TouchableOpacity>
            }
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        alignItems: "flex-end",
    },
    backdrop: {
        backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    panel: {
        flex: 1,
        width: PANEL_WIDTH,
        maxWidth: "85%",
        backgroundColor: colours.cardbackground,
        paddingHorizontal: 20,
        gap: 16,
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    title: {
        ...textStyles.title,
        fontSize: fonts.size.lg,
    },
    failure: {
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colours.red,
    },
    failureText: {
        ...textStyles.inputText,
        color: colours.light,
    },
    sections: {
        gap: 24,
        paddingBottom: 24,
    },
    section: {
        gap: 4,
    },
    sectionTitle: {
        ...textStyles.inputTitleText,
        textTransform: "uppercase",
        color: colours.inputTitle,
        paddingBottom: 4,
    },
    swipe: {
        borderRadius: 0,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: colours.cardbackground,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colours.buttonBorder,
    },
    rowButton: {
        flex: 1,
        paddingVertical: 12,
    },
    rowText: {
        ...textStyles.inputText,
        color: colours.light,
    },
    more: {
        ...textStyles.buttonLabel,
        color: colours.light,
        textDecorationLine: "underline",
        paddingTop: 8,
    },
    empty: {
        ...textStyles.inputText,
        color: colours.placeholderText,
    },
    hint: {
        ...textStyles.inputText,
        fontSize: fonts.size.sm,
        color: colours.placeholderText,
        textAlign: "center",
    },
});

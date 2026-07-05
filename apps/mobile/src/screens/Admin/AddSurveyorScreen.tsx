import { BackButton, ButtonGroup, InlineButton } from "@components/Button";
import { SurveyorCard } from "@components/SurveyorCard";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import { ScrollView, StyleSheet, View } from "react-native";
import React, { useRef, useState } from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSurveyService } from "@services/surveyServiceContext";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function AddSurveyorScreen(): React.JSX.Element {
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, 'AddSurveyorScreen'>>().params;
    const service = useSurveyService();
    const navigation = useNavigation<Nav>();

    type SurveyorDraft = { id: number, name: string };
    const [surveyors, setSurveyors] = useState<SurveyorDraft[]>([
        { id: 0, name: "" },
    ]);

    const nextId = useRef(1);

    const isLead = (surveyor: SurveyorDraft) => surveyor.id == 0;
    const addSurveyor = () => setSurveyors((prevSurveyorList) => [...prevSurveyorList, { id: nextId.current++, name: "" }]);
    const updateName = (id: number, name: string) => setSurveyors((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));

    const createSurveyors = async () => {
        try {
            const { surveyors: existing } = await service.getSurveyContext(surveyId);
            await Promise.all(existing.map((e) => service.removeSurveyor(e.id)));
            await Promise.all(surveyors.map((s) =>
                service.addSurveyor(surveyId, { name: s.name, isLead: isLead(s) })
            ))
            navigation.navigate('ReviewSurveyDetailsScreen', { surveyId })
        }
        catch (e) {
            console.error("error adding surveyor", e);
        }
    }

    const removeSurveyor = (id: number) => {
        setSurveyors((prevSurveyorList) => prevSurveyorList.filter((surveyor) => surveyor.id !== id));
    }

    //TODO : implement bottom sheet to add surveyor location

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Title title="Add Surveyors" subtitle="Add the name and site location of each surveyor for this survey" />
                <View style={styles.content} >
                    {surveyors.map((surveyor) => (
                        <SurveyorCard
                            key={surveyor.id}
                            isLead={isLead(surveyor)}
                            name={surveyor.name}
                            onChangeName={(text) => updateName(surveyor.id, text)}
                            onClose={() => removeSurveyor(surveyor.id)}
                        />
                    ))}
                    <InlineButton label="Add More Surveyors" onPress={addSurveyor} />
                </View>
                <ButtonGroup
                    variant="mixed"
                    labels={['Continue', 'Skip']}
                    onPress={[
                        async () => {
                            createSurveyors();
                        },
                        () => { navigation.navigate('ReviewSurveyDetailsScreen', { surveyId }) }
                    ]}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: {
        width: '100%',
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
    },
    content: {
        ...screen.content,
        flexGrow: 1,
        gap: 16,
        justifyContent: 'flex-start',
        paddingVertical: 24,
    }
})
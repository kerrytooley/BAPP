import { Button } from "@components/Common/Button";
import { Card } from "@components/Common/Card";
import { InputField } from "@components/Common/InputField";
import React from "react";

export interface SurveyorCardProps {
    isLead?: boolean;
    name: string;
    onChangeName: (name: string) => void;
    onEndEditingName: () => void
    onAddLocation?: () => void;
    onClose: () => void;
    hasLocation?: boolean;
    testID?: string;
}

export const SurveyorCard = ({
    isLead = false,
    name,
    onChangeName,
    onEndEditingName,
    onAddLocation,
    onClose,
    hasLocation = false,
    testID,
}: SurveyorCardProps) => {
    return (
        <Card cardLabel={isLead ? "Add Lead Surveyor" : "Add Surveyor"} removable={!isLead} onClose={onClose}>
            <InputField
                testID={testID}
                placeholderText="Input Surveyor Name"
                value={name}
                onChangeText={onChangeName}
                onEndEditing={onEndEditingName}
            />
            <Button label={hasLocation ? "Edit Surveyor Location" : "Add Surveyor Location"} action="location" onPress={onAddLocation} />
        </Card>
    );
};

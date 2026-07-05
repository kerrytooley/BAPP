import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { InputField } from "@components/InputField";
import React from "react";

export interface SurveyorCardProps {
    isLead?: boolean;
    name: string;
    onChangeName: (name: string) => void;
    onEndEditingName: () => void
    onAddLocation?: () => void;
    onClose: () => void;
    hasLocation?: boolean;
}

export const SurveyorCard = ({
    isLead = false,
    name,
    onChangeName,
    onEndEditingName,
    onAddLocation,
    onClose,
    hasLocation = false,
}: SurveyorCardProps) => {
    return (
        <Card cardLabel={isLead ? "Add Lead Surveyor" : "Add Surveyor"} removeable={isLead ? false : true} onClose={isLead ? () => { } : onClose}>
            <InputField
                placeholderText="Input Surveyor Name"
                value={name}
                onChangeText={onChangeName}
                onEndEditing={onEndEditingName}
            />
            <Button label={hasLocation ? "Edit Surveyor Location" : "Add Surveyor Location"} action="location" onPress={onAddLocation} />
        </Card>
    );
};

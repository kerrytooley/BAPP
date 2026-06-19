import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { InputField } from "@components/InputField";
import React from "react";

export interface SurveyorCardProps {
    isLead?: boolean;
    name: string;
    onChangeName: (name: string) => void;
    onAddLocation?: () => void;
}

export const SurveyorCard = ({
    isLead = false,
    name,
    onChangeName,
    onAddLocation,
}: SurveyorCardProps) => {


    return (
        <Card cardLabel={isLead ? "Add Lead Surveyor" : "Add Surveyor"}>
            <InputField
                placeholderText="Input Surveyor Name"
                value={name}
                onChangeText={onChangeName}
            />
            <Button label="Add Surveyor Location" action="location" onPress={onAddLocation} />
        </Card>
    );
};

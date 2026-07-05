import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { InputField } from "@components/InputField";
import React from "react";

export interface SurveyorCardProps {
    isLead?: boolean;
    name: string;
    onChangeName: (name: string) => void;
    onAddLocation?: () => void;
    isRemoveable?: boolean;
    onClose: () => void;
}

export const SurveyorCard = ({
    isLead = false,
    name,
    onChangeName,
    onAddLocation,
    onClose
}: SurveyorCardProps) => {


    return (
        <Card cardLabel={isLead ? "Add Lead Surveyor" : "Add Surveyor"} removeable={isLead ? false : true} onClose={isLead ? () => { } : onClose}>
            <InputField
                placeholderText="Input Surveyor Name"
                value={name}
                onChangeText={onChangeName}
            />
            <Button label="Add Surveyor Location" action="location" onPress={onAddLocation} />
        </Card>
    );
};

import React from 'react';
import { View, Text } from 'react-native';
import { Title } from '@components/Titles';
import { Button } from '@components/Button';
import { screen } from '@theme/screen';
import { textStyles } from '@theme/fonts';
import { colours } from '@theme/colours';

interface Props {
    onRetry: () => void;
    /** Optional error text, shown only in dev builds to aid debugging. */
    detail?: string;
}

/** Shown when Firebase is the configured backend but failed to connect, so the
 *  user is never left thinking their surveys are being saved when they are not. */
export function FirebaseConnectionError({ onRetry, detail }: Props): React.JSX.Element {
    return (
        <View style={[screen.justifyScreen, { justifyContent: 'center', gap: 32 }]}>
            <Title
                title="Can't connect to the server"
                subtitle="BAPP couldn't reach the survey database, so your data can't be saved right now. Check your internet connection and try again."
            />
            {detail != null && (
                <Text style={[textStyles.subtitle, { color: colours.inputTitle }]}>{detail}</Text>
            )}
            <Button label="Try again" variant="light" onPress={onRetry} />
        </View>
    );
}

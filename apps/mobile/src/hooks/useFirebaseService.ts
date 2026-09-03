import React from 'react';
import type { SurveyService } from '@bapp/domain';
import { isFirebaseEnabled, createFirebaseSurveyService } from '@services/firebaseSurveyService';

export interface FirebaseServiceState {
    /** The Firebase-backed service, or null when Firebase is disabled or failed. */
    service: SurveyService | null;
    /** False until the (async) init attempt settles; gates first render. */
    ready: boolean;
    /** True when Firebase is the configured backend but init rejected. */
    failed: boolean;
    /** The init error, kept for surfacing detail in dev builds. */
    error: Error | null;
    /** Re-run the init attempt (e.g. from a "Try again" button). */
    retry: () => void;
}

/** When Firebase is opted in, build its backend once before rendering; otherwise
 *  the screens use the default in-memory service from the context. */
export function useFirebaseService(): FirebaseServiceState {
    const [service, setService] = React.useState<SurveyService | null>(null);
    const [ready, setReady] = React.useState(!isFirebaseEnabled());
    const [error, setError] = React.useState<Error | null>(null);
    const [attempt, setAttempt] = React.useState(0);

    React.useEffect(() => {
        if (!isFirebaseEnabled()) return;
        let active = true;
        setReady(false);
        setError(null);
        createFirebaseSurveyService()
            .then((s) => { if (active) setService(s); })
            .catch((err) => {
                console.error('Firebase init failed', err);
                if (active) setError(err instanceof Error ? err : new Error(String(err)));
            })
            .finally(() => { if (active) setReady(true); });
        return () => { active = false; };
    }, [attempt]);

    const retry = React.useCallback(() => setAttempt((n) => n + 1), []);

    return { service, ready, failed: error !== null, error, retry };
}

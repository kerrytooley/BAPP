import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { SurveyContext } from "@bapp/domain";
import { useSurveyService } from "@services/surveyServiceContext";

interface ActiveSurvey {
    context: SurveyContext | null;
}

const ActiveSurveyContext = createContext<ActiveSurvey | null>(null);

/**
 * Holds a single live subscription for the currently-open survey and shares the
 * resulting `SurveyContext` with every consumer screen. Cache-first and
 * offline-safe: the service pushes the locally-cached context immediately and
 * again whenever the survey or its children change, so screens never refetch.
 *
 * The active `surveyId` is passed in as a prop (the App derives it from
 * navigation state) rather than read here, keeping the provider testable.
 */
export function ActiveSurveyProvider({
    surveyId,
    children,
}: {
    surveyId: string | undefined;
    children: ReactNode;
}): React.JSX.Element {
    const service = useSurveyService();
    const [context, setContext] = useState<SurveyContext | null>(null);

    useEffect(() => {
        if (surveyId === undefined) {
            setContext(null);
            return;
        }
        return service.subscribeSurveyContext(surveyId, (ctx) => {
            setContext(ctx);
            service.prefetchMedia(ctx);
        });
    }, [service, surveyId]);

    return (
        <ActiveSurveyContext.Provider value={{ context }}>
            {children}
        </ActiveSurveyContext.Provider>
    );
}

export function useActiveSurvey(): ActiveSurvey {
    const value = useContext(ActiveSurveyContext);
    if (value === null) {
        throw new Error("useActiveSurvey must be used within an ActiveSurveyProvider");
    }
    return value;
}

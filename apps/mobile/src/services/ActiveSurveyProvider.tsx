import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { SurveyContext } from "@bapp/domain";
import { useSurveyService } from "@services/surveyServiceContext";

interface ActiveSurvey {
    context: SurveyContext | null;
}

const ActiveSurveyContext = createContext<ActiveSurvey | null>(null);

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

import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { loadRecentSurveys, type RecentSurvey } from "@services/recentSurveys";

/** Recent surveys from device storage, reloaded whenever the screen regains focus. */
export function useRecentSurveys() {
    const [surveys, setSurveys] = useState<RecentSurvey[]>([]);

    const refresh = useCallback(async () => {
        setSurveys(await loadRecentSurveys());
    }, []);

    useFocusEffect(useCallback(() => {
        void refresh();
    }, [refresh]));

    return { surveys, refresh };
}

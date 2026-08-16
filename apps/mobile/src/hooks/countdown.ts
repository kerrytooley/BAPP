
//get remainng Ms 
// // accepts a target date, and transofrms the target (a Date) into a number representing a fix point in time in ms
// then subtracts Date.now() (also a number) form the target
// returns a number of milliseconds (or 0 if the target has been passed)


//use countdown:

// based on a set target date time

//calculate the remaining milliseconds until the target

//set an interval of 1 second (1000ms) to refresh the displayed count (not a ticker)
// the interval is each time setRemainingMs is fired, it fires it every second to update the displayed value

//when the target changes,or the component unmounts, clear the interval

//total seconds is a function that transforms remaining Ms into a H/M/S display value

import { useEffect, useState } from "react";

function getRemainingMs(target: Date | null): number {
    if (!target) return 0;
    return Math.max((target.getTime() - Date.now()), 0);
}

export function useCountdown(target: Date | null) {

    const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(target));

    useEffect(() => {
        setRemainingMs(getRemainingMs(target));
        const id = setInterval(() => setRemainingMs(getRemainingMs(target)), 1000);

        return () => clearInterval(id);
    }, [target]);

    const totalSeconds = Math.floor(remainingMs / 1000);
    return {
        remainingMs,
        isComplete: remainingMs === 0,
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60
    }
}


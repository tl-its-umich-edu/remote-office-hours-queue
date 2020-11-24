import { useState } from "react";

import { Base } from "../models"; 
import { ChangeEvent, compareEntities } from "../changes";


export function useEntityChanges<T extends Base>():
    [ChangeEvent[], (oldEntities: readonly T[], newEntities: readonly T[]) => void, (key: number) => void]
{
    const [changeEvents, setChangeEvents] = useState([] as ChangeEvent[]);
    const [nextID, setNextID] = useState(0);

    const compareAndSetEventMap = (oldEntities: readonly T[], newEntities: readonly T[]): void => {
        const changeText = compareEntities<T>(oldEntities.slice(), newEntities.slice());
        if (changeText !== undefined) {
            const newChangeEvent = { eventID: nextID, text: changeText } as ChangeEvent;
            setChangeEvents([...changeEvents, newChangeEvent]);
            setNextID(nextID + 1);
        }
    }

    const popChangeEvent = (id: number) => {
        const newArray = changeEvents.filter((e) => id !== e.eventID);
        setChangeEvents(newArray);
    };

    return [changeEvents, compareAndSetEventMap, popChangeEvent];
}

import { useState } from "react";

import { Base } from "../models"; 
import { compareEntities, ChangeEventMap, EntityType } from "../changes";


export function useEntityChanges<T extends Base>(entityType: EntityType):
    [ChangeEventMap, (oldEntities: readonly T[], newEntities: readonly T[]) => void, (key: number) => void]
{
    const [changeEventMap, setChangeEventMap] = useState({} as ChangeEventMap);
    const numEvents = Object.keys(changeEventMap).length;
    const nextKey = numEvents > 0 ? Number(Object.keys(changeEventMap)[numEvents - 1]) + 1 : 0;

    const compareAndSetEventMap = (oldEntities: readonly T[], newEntities: readonly T[]): void => {
        const newChangeEvent = compareEntities<T>(entityType, oldEntities.slice(), newEntities.slice());
        if (newChangeEvent !== undefined) {
            const newMap = {} as ChangeEventMap;
            newMap[nextKey] = newChangeEvent;
            setChangeEventMap(Object.assign({...changeEventMap}, newMap));
        }
    }

    const popChangeEvent = (key: number) => {
        const newEventMap = {...changeEventMap};
        delete newEventMap[Number(key)];
        setChangeEventMap(newEventMap);
    };

    return [changeEventMap, compareAndSetEventMap, popChangeEvent];
}

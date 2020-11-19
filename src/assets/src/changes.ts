import xorWith from "lodash.xorwith";
import isEqual from "lodash.isequal";

import { Base, isQueueBase, isMeeting } from "./models"


export interface ChangeEvent {
    entityID: number;
    message: string;
}

export interface ChangeEventMap {
    [id: number]: ChangeEvent;
}

// https://lodash.com/docs/4.17.15#xorWith

export function compareEntities<T extends Base> (oldOnes: T[], newOnes: T[]):
    ChangeEvent | undefined
{
    const symDiff = xorWith(oldOnes, newOnes, isEqual);
    if (symDiff.length === 0) return;
    const firstEntity = symDiff[0];

    let entityType;
    if (isMeeting(firstEntity)) {
        entityType = 'meeting';
    } else if (isQueueBase(firstEntity)) {
        entityType = 'queue';
    } else {
        console.error(`compareEntities was used with an unsupported type: ${firstEntity}`)
        return;
    }

    let message;
    if (oldOnes.length < newOnes.length) {
        message = `A new ${entityType} with ID number ${firstEntity.id} was added.`;
    } else if (oldOnes.length > newOnes.length) {
        message = `The ${entityType} with ID number ${firstEntity.id} was deleted.`;
    } else {
        message = `The ${entityType} with ID number ${firstEntity.id} was changed.`;
    }
    return { entityID: firstEntity.id, message: message };
}

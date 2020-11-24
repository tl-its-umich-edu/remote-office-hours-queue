import xorWith from "lodash.xorwith";
import isEqual from "lodash.isequal";

import { Base, isMeeting, isQueueBase, isUser, Meeting, QueueBase } from "./models"


export interface ChangeEvent {
    eventID: number;
    text: string;
}

const queueBasePropsToWatch: (keyof QueueBase)[] = ['status', 'name'];
const meetingPropsToWatch: (keyof Meeting)[] = ['backend_type', 'assignee'];

interface HumanReadableMap {
    [key: string]: string;
}

const propertyMap: HumanReadableMap = {
    'backend_type': 'meeting type',
    'assignee': 'host'
}

function detectChanges<T extends Base>(versOne: T, versTwo: T, propsToWatch: (keyof T)[]): string {
    for (const property of propsToWatch) {
        if (versOne[property] !== versTwo[property]) {
            let valueOne = versOne[property] as T[keyof T] | string;
            let valueTwo = versTwo[property] as T[keyof T] | string;
            // Check for nested user objects
            if (isUser(valueOne)) valueOne = valueOne.username;
            if (isUser(valueTwo)) valueTwo = valueTwo.username;
            // Make some property strings more human readable
            const propName = (property in propertyMap) ? propertyMap[property as string] : property;
            return `The ${propName} changed from "${valueOne}" to "${valueTwo}".`;
        }
    }
    return '';
}


// https://lodash.com/docs/4.17.15#xorWith

export function compareEntities<T extends Base> (oldOnes: T[], newOnes: T[]): string | undefined
{
    const symDiff = xorWith(oldOnes, newOnes, isEqual);
    if (symDiff.length === 0) return;
    const firstEntity = symDiff[0];
    const secondEntity = symDiff.length > 1 ? symDiff[1] : undefined;

    let entityType;
    let permIdentifier;
    if (isMeeting(firstEntity)) {
        entityType = 'meeting';
        // meeting.attendees may change in the future?
        permIdentifier = `attendee ${firstEntity.attendees[0].username}`;
    } else if (isQueueBase(firstEntity)) {
        entityType = 'queue';
        permIdentifier = `ID number ${firstEntity.id}`;
    } else {
        console.error(`compareEntities was used with an unsupported type: ${firstEntity}`)
        return;
    }

    let message;
    if (oldOnes.length < newOnes.length) {
        message = `A new ${entityType} with ${permIdentifier} was added.`;
    } else if (oldOnes.length > newOnes.length) {
        message = `The ${entityType} with ${permIdentifier} was deleted.`;
    } else {
        let changeDetected;
        if (secondEntity) {
            if (isMeeting(firstEntity) && isMeeting(secondEntity)) {
                changeDetected = detectChanges<Meeting>(firstEntity, secondEntity, meetingPropsToWatch);
            } else if (isQueueBase(firstEntity) && isQueueBase(secondEntity)) {
                changeDetected = detectChanges<QueueBase>(firstEntity, secondEntity, queueBasePropsToWatch);
            }
        }
        message = `The ${entityType} with ${permIdentifier} was changed.`;
        if (changeDetected) {
            message = message + ' ' + changeDetected;
        }
    }
    return message;
}

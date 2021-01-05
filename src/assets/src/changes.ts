import xorWith from "lodash.xorwith";
import isEqual from "lodash.isequal";

import { isMeeting, isQueueBase, isUser, Meeting, MeetingStatus, QueueBase } from "./models"

export type ComparableEntity = QueueBase | Meeting;

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

function detectChanges<T extends ComparableEntity>(versOne: T, versTwo: T, propsToWatch: (keyof T)[]): string | undefined {
    for (const property of propsToWatch) {
        let valueOne = versOne[property] as T[keyof T] | string;
        let valueTwo = versTwo[property] as T[keyof T] | string;
        // Check for nested user objects and falsy values
        if (isUser(valueOne)) valueOne = valueOne.username;
        if (!valueOne) valueOne = 'None';
        if (isUser(valueTwo)) valueTwo = valueTwo.username;
        if (!valueTwo) valueTwo = 'None';
        if (valueOne !== valueTwo) {
            // Make some property strings more human readable
            const propName = (property in propertyMap) ? propertyMap[property as string] : property;
            return `The ${propName} changed from "${valueOne}" to "${valueTwo}".`;
        }
    }
    return;
}


// https://lodash.com/docs/4.17.15#xorWith

export function compareEntities<T extends ComparableEntity> (oldOnes: T[], newOnes: T[]): string | undefined
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
        return `A new ${entityType} with ${permIdentifier} was added.`;
    } else if (oldOnes.length > newOnes.length) {
        return `The ${entityType} with ${permIdentifier} was deleted.`;
    } else {
        let changeDetected;
        if (secondEntity) {
            if (isMeeting(firstEntity) && isMeeting(secondEntity)) {
                changeDetected = detectChanges<Meeting>(firstEntity, secondEntity, meetingPropsToWatch);
                if (!changeDetected && firstEntity.status !== secondEntity.status && secondEntity.status === MeetingStatus.STARTED) {
                    changeDetected = 'The status indicates the meeting is now in progress.';
                }
            } else if (isQueueBase(firstEntity) && isQueueBase(secondEntity)) {
                changeDetected = detectChanges<QueueBase>(firstEntity, secondEntity, queueBasePropsToWatch);
            }
        }
        message = `The ${entityType} with ${permIdentifier} was changed.`;
        if (changeDetected) {
            message = message + ' ' + changeDetected;
            return message;
        }
    }
    return;
}

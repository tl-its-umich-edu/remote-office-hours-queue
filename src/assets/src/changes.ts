import xorWith from "lodash.xorwith";
import isEqual from "lodash.isequal";

import { isMeeting, isQueueBase, isUser, Meeting, MeetingStatus, QueueBase } from "./models";

export type ComparableEntity = QueueBase | Meeting;

export interface ChangeEvent {
    eventID: number;
    text: string;
}

const queueBasePropsToWatch: (keyof QueueBase)[] = ['status', 'name'];
const meetingPropsToWatch: (keyof Meeting)[] = ['backend_type', 'assignee'];


// Value Transformations

type ValueTransform = (value: any) => any;

const transformUserToUsername: ValueTransform = (value) => {
    return isUser(value) ? value.username : value;
};

const transformFalsyToNone: ValueTransform = (value) => {
    return value === null || value === undefined || value === '' ? 'None' : value;
}

function transformValue (value: any, transforms: ValueTransform[]): any {
    let newValue = value;
    for (const transform of transforms) {
        newValue = transform(newValue);
    }
    return newValue;
}

const standardTransforms = [transformUserToUsername, transformFalsyToNone];


// Property Transformations

interface HumanReadableMap { [key: string]: string; }

const humanReadablePropertyMap: HumanReadableMap = {
    'backend_type': 'meeting type',
    'assignee': 'host'
};

const transformProperty = (value: string, propertyMap: HumanReadableMap) => {
    return (value in propertyMap) ? propertyMap[value] : value;
}


// Core functions

function detectChanges<T extends ComparableEntity> (
    versOne: T, versTwo: T, propsToWatch: (keyof T)[], transforms: ValueTransform[]): string[]
{
    let changedPropMessages = [];
    for (const property of propsToWatch) {
        let valueOne = versOne[property] as T[keyof T] | string;
        let valueTwo = versTwo[property] as T[keyof T] | string;
        valueOne = transformValue(valueOne, transforms);
        valueTwo = transformValue(valueTwo, transforms);
        if (valueOne !== valueTwo) {
            const propName = transformProperty(property as string, humanReadablePropertyMap);
            changedPropMessages.push(`The ${propName} changed from "${valueOne}" to "${valueTwo}".`);
        }
    }
    return changedPropMessages;
}


// Any new types added to ComparableEntity need to be supported in this function.

function describeEntity (entity: ComparableEntity): string[] {
    let entityType;
    let permIdent;
    if (isMeeting(entity)) {
        entityType = 'meeting';
        permIdent = `attendee ${entity.attendees[0].username}`;
    } else {
        // Don't need to check if it's a QueueBase because it's the only other option
        entityType = 'queue';
        permIdent = `ID number ${entity.id}`;
    }
    return [entityType, permIdent];
}


// https://lodash.com/docs/4.17.15#xorWith

export function compareEntities<T extends ComparableEntity> (oldOnes: T[], newOnes: T[]): string[]
{
    const symDiff = xorWith(oldOnes, newOnes, isEqual);
        if (symDiff.length === 0) return [];

    const oldIDs = oldOnes.map((value) => value.id);
    const newIDs = newOnes.map((value) => value.id);

    let changeMessages: string[] = [];
    let processedChangedObjectIDs: number[] = [];
    for (const entity of symDiff) {
        if (processedChangedObjectIDs.includes(entity.id)) continue;
        const [entityType, permIdent] = describeEntity(entity);
        if (oldIDs.includes(entity.id) && !newIDs.includes(entity.id)) {
            changeMessages.push(`The ${entityType} with ${permIdent} was deleted.`);
        } else if (!oldIDs.includes(entity.id) && newIDs.includes(entity.id)) {
            changeMessages.push(`A new ${entityType} with ${permIdent} was added.`);
        } else {
            // Assuming based on context that symDiff.length === 2
            const [firstEntity, secondEntity] = symDiff.filter(value => value.id === entity.id);
            let changesDetected: string[] = [];
            if (isMeeting(firstEntity) && isMeeting(secondEntity)) {
                const changes = detectChanges<Meeting>(firstEntity, secondEntity, meetingPropsToWatch, standardTransforms);
                if (changes.length > 0) changesDetected.push(...changes);
                // Custom check for Meeting.status, since only some status changes are relevant here.
                if (firstEntity.status !== secondEntity.status && secondEntity.status === MeetingStatus.STARTED) {
                    changesDetected.push('The meeting is now in progress.');
                }
            } else if (isQueueBase(firstEntity) && isQueueBase(secondEntity)) {
                const changes = detectChanges<QueueBase>(firstEntity, secondEntity, queueBasePropsToWatch, standardTransforms);
                if (changes.length > 0) changesDetected.push(...changes);
            }
            if (changesDetected.length > 0) {
                changeMessages.push(`The ${entityType} with ${permIdent} was changed. ` + changesDetected.join(' '));
            }
            processedChangedObjectIDs.push(entity.id)
        }
    }
    return changeMessages;
}

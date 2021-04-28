import { string, StringSchema, SchemaDescription, TestMessageParams } from 'yup';
import { MeetingBackend, MeetingStatus, QueueHost } from "./models";
import { getUser } from "./services/api";

// Yup: https://github.com/jquense/yup


// Utilities

function getMaxLimit (description: SchemaDescription): number | undefined {
    const matches = description.tests.filter((obj: any) => obj.params?.max);
    if (matches.length !== 1) {
        console.error('Invalid use of getMaxLimit: ' + matches);
    }
    return matches.length === 1 ? matches[0].params.max : undefined;
}

function createRemainingCharsMessage (data: { max: number; } & Partial<TestMessageParams>): string {
    const remaining = data.max - data.value.length;
    const charsRemaining = (remaining > 0) ? remaining : 0;
    const charsOver = (remaining < 0) ? ` (${remaining * -1} over limit)` : '';
    return `Remaining characters: ${charsRemaining}/${data.max}${charsOver}`;
}

const createInvalidUniqnameMessage = (uniqname: string) => (
    uniqname + " is not a valid user. " +
    "Please make sure the uniqname is correct, and that they have logged onto Remote Office Hours Queue at least once."
);

export const confirmUserExists = async (uniqname: string) => {
    const sanitizedUniqname = uniqname.trim().toLowerCase();
    try {
        return await getUser(sanitizedUniqname);
    } catch (err) {
        throw err.name === "NotFoundError"
            ? new Error(createInvalidUniqnameMessage(sanitizedUniqname))
            : err;
    }
}

export const validatePhoneNumber = (phone: string, countryDialCode: string): Error[] => {
    return [
        (countryDialCode === '1' && phone.length !== 11)
            && new Error(
                'Please enter a valid US/Canada phone number with area code ' +
                '(11 digits including +1 country code) that can receive SMS messages.'
            ),
    ].filter(e => e) as Error[];
}


// Schemas

const blankText = 'This field may not be left blank.';

export const queueNameSchema = string().trim().required(blankText).max(100, createRemainingCharsMessage);
export const queueDescriptSchema = string().trim().max(1000, createRemainingCharsMessage);
export const meetingAgendaSchema = string().trim().max(100, createRemainingCharsMessage);
export const queueLocationSchema = string().trim().max(100, createRemainingCharsMessage);
export const uniqnameSchema = string().trim().lowercase()
    .min(3, 'Uniqnames must be at least 3 characters long.')
    .max(8, 'Uniqnames must be at most 8 characters long.')
    .matches(/^[a-z]+$/i, 'Uniqnames cannot contain non-alphabetical characters.');


// Type validator(s)

export interface ValidationResult {
    transformedValue: string;
    isInvalid: boolean;
    messages: ReadonlyArray<string>;
}

export function validateString (value: string, schema: StringSchema, showRemaining: boolean): ValidationResult {
    let transformedValue;
    let isInvalid = false;
    let messages = Array();
    try {
        transformedValue = schema.validateSync(value);
        const maxLimit = getMaxLimit(schema.describe());
        if (showRemaining && maxLimit) {
            messages.push(createRemainingCharsMessage({'value': transformedValue, 'max': maxLimit}));
        }
    } catch (error) {
        transformedValue = error.value;
        isInvalid = true;
        messages = error.errors;
    }
    return {'transformedValue': transformedValue, 'isInvalid': isInvalid, 'messages': messages};
}


export interface MeetingTypesValidationResult {
    isInvalid: boolean;
    messages: ReadonlyArray<string>;
}

export function validateMeetingTypes (value: Set<string>, backends: MeetingBackend[], queue?: QueueHost): MeetingTypesValidationResult {
    let messages = [];

    const noTypesSelected = value.size === 0;
    if (noTypesSelected) messages.push('You must select at least one allowed meeting type.');

    let existingMeetingConflict = false;
    if (queue) {
        const unstartedMeetings = queue!.meeting_set.filter(m => m.status !== MeetingStatus.STARTED);
        const uniqueUnstartedMeetingTypes = new Set(unstartedMeetings.map(m => m.backend_type));
        const conflictingTypes = [...uniqueUnstartedMeetingTypes]
            .filter(uniqueMeetingType => !value.has(uniqueMeetingType));
        const conflictingTypeNames = conflictingTypes
            .map(ct => backends.find(b => b.name === ct)?.friendly_name ?? ct);
        if (conflictingTypes.length > 0) {
            existingMeetingConflict = true;
            messages.push(
                'You cannot disallow the following meeting types until the meetings ' +
                'using them have been removed from the queue: ' +
                conflictingTypeNames.join(', ')
            );
        }
    }
    return { isInvalid: (noTypesSelected || existingMeetingConflict), messages: messages };
}

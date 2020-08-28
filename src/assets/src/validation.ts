import { string, StringSchema, SchemaDescription } from 'yup'

// Yup: https://github.com/jquense/yup


// Utilities

function getMaxLimit (description: SchemaDescription): number | undefined {
    const matches = description.tests.filter((obj) => obj.params?.max);
    if (matches.length !== 1) {
        console.error('Invalid use of getMaxLimit: ' + matches);
    }
    return matches.length === 1 ? matches[0].params.max : undefined;
}

function createRemainingCharsMessage (data: any): string | undefined {
    // Type of input could be StringLocale, but wasn't sure how to handle undefineds
    // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/yup/index.d.ts
    if (data && 'max' in data && 'value' in data) {
        const remaining = data!.max - data!.value.length;
        const charsRemaining = (remaining > 0) ? remaining : 0;
        const charsOver = (remaining < 0) ? ` (${remaining * -1} over limit)` : '';
        return `Remaining characters: ${charsRemaining}/${data.max}${charsOver}`;
    } else {
        return undefined;
    }
}

export const createInvalidUniqnameMessage = (uniqname: string) => (
    uniqname + " is not a valid user. " +
    "Please make sure the uniqname is correct, and that they have logged onto Remote Office Hours Queue at least once."
)


// Schemas

const blankText = 'This field may not be left blank.'

export const queueTitleSchema = string().required(blankText).max(100, createRemainingCharsMessage);
export const queueDescriptSchema = string().max(1000, createRemainingCharsMessage);
export const meetingAgendaSchema = string().max(100, createRemainingCharsMessage);
export const uniqnameSchema = string().trim().lowercase()
    .min(3, 'Uniqnames must be at least 3 characters long.')
    .max(8, 'Uniqnames must be at most 8 characters long.')
    .matches(/^[a-z]+$/i, 'Uniqnames cannot contain non-alphanumeric characters.')


// Type validators

export interface ValidationResult {
    isInvalid: boolean;
    messages: ReadonlyArray<string>;
}

export function reportErrors(messages: ReadonlyArray<string>) {
    console.log('Arent these messages: ' + messages);
    for (let message of messages) {
        console.log(message)
        throw new Error(message);
    }
}


export function validateString (value: string, schema: StringSchema, showRemaining: boolean): ValidationResult {
    let messages = Array();
    let isInvalid = false;
    try {
        // We could also do this asynchronously with .validate, but wasn't sure if that was needed?
        schema.validateSync(value)
        const maxLimit = getMaxLimit(schema.describe());
        if (showRemaining && maxLimit) {
            messages.push(createRemainingCharsMessage({'value': value, 'max': maxLimit}));
        }
    } catch (error) {
        console.log(error.name);
        console.log(error.errors);
        isInvalid = true;
        messages = error.errors;
    }
    return {'isInvalid': isInvalid, 'messages': messages};
}

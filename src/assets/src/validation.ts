import { string, StringSchema, SchemaDescription } from 'yup'

// Yup: https://github.com/jquense/yup


// Utilities

function getMaxLimit (description: SchemaDescription): number | undefined {
    const matches = description.tests.filter((obj) => obj.params?.max);
    if (matches.length !== 1) {
        console.error('Invalid use of getMaxLimit: ' + matches)
    }
    return matches.length === 1 ? matches[0].params.max : undefined
}

function createRemainingCharsMessage (data: any) {
    // Type of input could be StringLocale['max'], but wasn't sure how to handle undefineds
    // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/yup/index.d.ts
    const remaining = data.max - data.value.length;
    const charsRemaining = (remaining > 0) ? remaining : 0;
    const charsOver = (remaining < 0) ? ` (${remaining * -1} over limit)` : '';
    return `Remaining characters: ${charsRemaining}/${data.max}${charsOver}`;
}

// Schemas

const queueTitleSchema = string().required('This field may not be left blank.').max(100, createRemainingCharsMessage).min(2);
const queueDescriptSchema = string().max(1000, createRemainingCharsMessage).max(1000, '');
const meetingAgendaSchema = string().max(100, createRemainingCharsMessage);


// Type validators

interface ValidationResult {
    isInvalid: boolean;
    messages: ReadonlyArray<string>
}

function validateString (value: string, schema: StringSchema, showRemaining: boolean): ValidationResult {
    let messages = Array();
    let isInvalid = false;
    try {
        // We could also do this asynchronously with .validate, but wasn't sure if that was needed?
        console.log(schema.validateSync(value))
        const maxLimit = getMaxLimit(schema.describe())
        if (showRemaining && maxLimit) {
            messages.push(createRemainingCharsMessage({'value': value, 'max': maxLimit}))
        }
    } catch (error) {
        console.log(error.name);
        console.log(error.errors);
        isInvalid = true;
        messages = error.errors;
    }
    return {'isInvalid': isInvalid, 'messages': messages}
}

export { validateString, queueDescriptSchema, meetingAgendaSchema, queueTitleSchema };

import { useState } from "react";
import { StringSchema } from "yup";

import { MeetingBackend, QueueHost } from "../models";
import { 
    MeetingTypesValidationResult, validateMeetingTypes, validateString, ValidationResult
} from "../validation";


export function useStringValidation (schema: StringSchema<string>, showRemaining?: boolean):
    [undefined | ValidationResult, (value: string) => ValidationResult, () => void]
{
    const [validationResult, setValidationResult] = useState(undefined as undefined | ValidationResult);
    const validateAndSetResult = (newValue: string) => {
        const result = validateString(newValue, schema, !!showRemaining);
        setValidationResult(result);
        return result;
    }
    const clearResult = () => setValidationResult(undefined);
    return [validationResult, validateAndSetResult, clearResult];
}

export function useMeetingTypesValidation (backends: MeetingBackend[], queue?: QueueHost):
    [undefined | MeetingTypesValidationResult, (value: Set<string>) => MeetingTypesValidationResult, () => void]
{
    const [validationResult, setValidationResult] = useState(undefined as undefined | MeetingTypesValidationResult);
    const validateAndSetResult = (newValue: Set<string>) => {
        const result = validateMeetingTypes(newValue, backends, queue);
        setValidationResult(result);
        return result;
    }
    const clearResult = () => setValidationResult(undefined);
    return [validationResult, validateAndSetResult, clearResult];
}

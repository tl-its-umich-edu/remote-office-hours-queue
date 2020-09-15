import * as ReactGA from "react-ga";
import { getUser } from "./services/api";
import { reportErrors, createInvalidUniqnameMessage, validateString, ValidationResult, uniqnameSchema} from "./validation"

export const redirectToLogin = (loginUrl: string) => {
    ReactGA.event({
        category: "Auth",
        action: "Redirected to Login",
        nonInteraction: true,
    });
    location.href = loginUrl + '?next=' + location.pathname;
}

export const redirectToSearch = (term: string) => {
    ReactGA.event({
        category: "Navigation",
        action: "Redirected to Search",
        nonInteraction: true,
    });
    location.href = `/search/${term}/?redirected=true`;
}

export const validateAndFetchUser = async (uniqname: string) => {
    const result: ValidationResult = validateString(uniqname, uniqnameSchema, false)
    if (result.isInvalid) {
        reportErrors(result.messages)
    }
    try {
        return await getUser(result.transformedValue);
    } catch (err) {
        throw err.name === "NotFoundError"
            ? new Error(createInvalidUniqnameMessage(result.transformedValue))
            : err;
    }
}

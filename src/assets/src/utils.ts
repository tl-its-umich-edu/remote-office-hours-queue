import * as ReactGA from "react-ga";
import { getUser } from "./services/api";

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

const invalidUniqnameMessage = (uniqname: string) =>
    uniqname + " is not a valid user. Please make sure the uniqname is correct, and that they have logged onto Remote Office Hours Queue at least once."

export const validateAndFetchUser = async (uniqname: string) => {
    if (uniqname.length < 3) throw new Error("Uniqnames must be at least 3 characters long.");
    if (uniqname.length > 8) throw new Error("Uniqnames must be at most 8 characters long.");
    if (!uniqname.match(/^[a-z]+$/i)) throw new Error("Uniqnames cannot contain non-alphanumeric characters.");
    try {
        return await getUser(uniqname);
    } catch (err) {
        throw err.name === "NotFoundError"
            ? new Error(invalidUniqnameMessage(uniqname))
            : err;
    }
}

export const sanitizeUniqname = (unsanitized: string) => {
    return unsanitized.trim().toLowerCase();
}

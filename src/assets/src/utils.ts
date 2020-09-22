import * as ReactGA from "react-ga";
import { getUser } from "./services/api";
import { createInvalidUniqnameMessage } from "./validation";

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

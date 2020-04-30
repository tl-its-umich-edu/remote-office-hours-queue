import * as ReactGA from "react-ga";

export const redirectToLogin = () => {
    ReactGA.event({
        category: "Auth",
        action: "Redirected to Login",
        nonInteraction: true,
    });
    location.href = '/oidc/authenticate/?next=' + location.pathname;
}

export const redirectToSearch = (term: string) => {
    ReactGA.event({
        category: "Navigation",
        action: "Redirected to Search",
        nonInteraction: true,
    });
    location.href = `/search/${term}/?redirected=true`;
}

export const validateUniqname = (uniqname: string) => {
    if (uniqname.length < 3) throw new Error("Uniqnames must be at least 3 characters long.");
    if (uniqname.length > 8) throw new Error("Uniqnames must be at most 8 characters long.");
    if (!uniqname.match(/^[a-z]+$/i)) throw new Error("Uniqnames cannot contain non-alphanumeric characters.");
}

export const sanitizeUniqname = (unsanitized: string) => {
    return unsanitized.trim().toLowerCase();
}

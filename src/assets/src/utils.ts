import * as ReactGA from "react-ga";

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

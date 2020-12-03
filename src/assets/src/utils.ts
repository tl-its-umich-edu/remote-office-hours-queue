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

export const redirectToBackendAuth = (backend: string) => {
    ReactGA.event({
        category: "Auth",
        action: `Redirected to ${backend} Auth`,
        nonInteraction: true,
    });
    location.href = `/auth/${backend}/`;
}

export const recordQueueManagementEvent = (action: string) => {
    ReactGA.event({
        category: "Queue Management",
        action,
    });
}

/* Determines elements missing from one of the two sets, returning true if there the count is greater than one,
   false if it is zero. Inspired by the symmetricDifference function for sets implemented by MDN:
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set */
export function checkIfSetsAreDifferent(setA: Set<any>, setB: Set<any>) {
    let difference = new Set(setA);
    for (let elem of setB) {
        if (difference.has(elem)) {
            difference.delete(elem);
        } else {
            difference.add(elem);
        }
    }
    return !!difference.size;
}

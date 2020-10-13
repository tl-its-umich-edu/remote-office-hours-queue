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

export const recordQueueManagementEvent = (action: string) => {
    ReactGA.event({
        category: "Queue Management",
        action,
    });
}

/* Compares two arrays of strings, returning false if any difference in elements is found,
   true if they have the same elements. */
export const compareStringArrays = (arrayOne: string[], arrayTwo: string[]): boolean => {
    if (arrayOne.length !== arrayTwo.length) return false;

    const arrayOneSorted = arrayOne.slice().sort();
    const arrayTwoSorted = arrayTwo.slice().sort();
    for (let step = 0; step < arrayOneSorted.length; step++) {
        if (arrayOneSorted[step] !== arrayTwoSorted[step]) return false;
    }
    return true;
}

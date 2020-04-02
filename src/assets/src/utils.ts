export const redirectToLogin = () => {
    location.href = '/oidc/authenticate/?next=' + location.pathname;
}

export const validateUniqname = (uniqname: string) => {
    if (uniqname.length < 3) throw new Error("Uniqnames must be at least 3 characters long.");
    if (uniqname.length > 8) throw new Error("Uniqnames must be at most 8 characters long.");
    if (!uniqname.match(/^[a-z]+$/i)) throw new Error("Uniqnames cannot contain non-alphanumeric characters.");
}

export const sanitizeUniqname = (unsanitized: string) => {
    return unsanitized.trim().toLowerCase();
}

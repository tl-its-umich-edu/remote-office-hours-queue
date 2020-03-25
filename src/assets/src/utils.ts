export const redirectToLogin = () => {
    location.href = '/oidc/authenticate/?next=' + location.pathname;
}

function App(props) {
    const globals = props.globals;
    return `Hello, ${globals.user.username}!`;
}
export { App }

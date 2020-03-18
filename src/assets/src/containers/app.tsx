import * as React from "react";
import { Globals } from "../index";

interface AppProps {
    globals: Globals;
}

export function App(props: AppProps) {
    const globals = props.globals;
    const hello = `Hello, ${globals.user?.username}!`;
    return <p>{hello}</p>;
}

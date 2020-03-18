import * as React from "react";
import { User } from "..";

interface PageProps {
    user?: User;
}

export function Home(props: PageProps) {
    const hello = `Hello, ${props.user?.username}!`;
    return <p>{hello}</p>;
}

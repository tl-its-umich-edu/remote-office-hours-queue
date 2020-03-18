import * as React from "react";
import { User } from "..";

interface PageProps {
    user?: User;
}

export function Manage(props: PageProps) {
    const hello = `Manage, ${props.user?.username}!`;
    return <p>{hello}</p>;
}
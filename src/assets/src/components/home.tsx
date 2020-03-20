import * as React from "react";
import { User } from "../models";

interface HomePageProps {
    user?: User;
}

export function HomePage(props: HomePageProps) {
    const hello = `Hello, ${props.user?.username}!`;
    return <p>{hello}</p>;
}

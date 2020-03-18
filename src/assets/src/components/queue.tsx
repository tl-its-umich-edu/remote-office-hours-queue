import * as React from "react";
import { useParams } from "react-router-dom";
import { User } from "..";

interface PageProps {
    user?: User;
}

export function Queue(props: PageProps) {
    let { uniqname } = useParams();
    const hello = `Queue for ${uniqname}!`;
    return <p>{hello}</p>;
}

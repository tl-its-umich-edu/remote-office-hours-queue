import * as React from "react";
import { useParams } from "react-router-dom";
import { User } from "../models";

interface QueuePageProps {
    user?: User;
}

export function QueuePage(props: QueuePageProps) {
    let { uniqname } = useParams();
    const hello = `Queue for ${uniqname}!`;
    return <p>{hello}</p>;
}

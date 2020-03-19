import * as React from "react";
import { useState, useEffect } from "react";
import { getQueuesFake } from "../services/api";
import { User, Queue } from "../models";

interface QueueDetailsProps {
    queue: Queue;
}

function QueueDetails(props: QueueDetailsProps) {
    return (
        <span>{props.queue.name}</span>
    )
}

interface QueueListProps {
    queues: Queue[];
}

function QueueList(props: QueueListProps) {
    const queues = props.queues.map((q) => <li><QueueDetails queue={q} /></li>)
    return (
        <ul>{queues}</ul>
    )
}

interface ManageProps {
    user?: User;
}

export function Manage(props: ManageProps) {
    const [queues, setQueue] = useState(undefined as Queue[] | undefined);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        getQueuesFake()
            .then((data) => {
                setQueue(data);
                setIsLoading(false);
            })
            .catch((error) => {
                throw new Error(error);
            });
    }, [queues]);
    const queueList = queues !== undefined
        ? <QueueList queues={queues} />
        : <span>Loading...</span>;
    return (
        <div>{queueList}</div>
    )
}

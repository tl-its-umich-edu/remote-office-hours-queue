import * as React from "react";
import { useState, useEffect } from "react";
import { getQueuesFake } from "../services/api";
import { User, Queue } from "../models";

interface QueueDetailsProps {
    queue: Queue;
}

function QueueDetails(props: QueueDetailsProps) {
    const hosts = props.queue.hosts
        .map(h => <dd>{h.user.username}</dd>);
    const meetings = props.queue.meetings
        .map(m => <dd>{m.attendees[0]!.user.username}</dd>)
    return (
        <dl>
            <dt>ID</dt>
            <dd>{props.queue.id}</dd>
            <dt>Name</dt>
            <dd>{props.queue.name}</dd>
            <dt>Created At</dt>
            <dd>{props.queue.created_at}</dd>
            <dt>Hosted By</dt>
            {hosts}
            <dt>Meetings</dt>
            {meetings}
        </dl>
    )
}

interface QueueListProps {
    queues: Queue[];
}

function QueueList(props: QueueListProps) {
    const queues = props.queues.map((q) => <li><QueueDetails key={q.id} queue={q} /></li>)
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

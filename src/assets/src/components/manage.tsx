import * as React from "react";
import { useState, useEffect } from "react";
import { getQueuesFake as apiGetQueues, addQueueFake as apiAddQueue, removeQueueFake as apiRemoveQueue } from "../services/api";
import { User, ManageQueue } from "../models";
import { RemoveButton, AddButton } from "./common";
import { Link } from "react-router-dom";

interface QueueListProps {
    queues: ManageQueue[];
    refresh: () => void;
}

function QueueList(props: QueueListProps) {
    const removeQueue = (q: ManageQueue) => {
        apiRemoveQueue(q.id);
        props.refresh();
    }
    const queues = props.queues.map((q) => 
        <li>
            <Link to={`/manage/${q.id}`}>
                {q.id}: {q.name}
            </Link>
            <RemoveButton remove={() => removeQueue(q)}> Delete Queue</RemoveButton>
        </li>
    );
    const addQueue = () => {
        const name = prompt("Queue name?", "Queueueueueue");
        if (!name) return;
        apiAddQueue(name);
        props.refresh();
    }
    return (
        <div>
            <ul>{queues}</ul>
            <AddButton add={() => addQueue()}> Add Queue</AddButton>
        </div>
    );
}

interface ManagePageProps {
    user?: User;
}

export function ManagePage(props: ManagePageProps) {
    const [queues, setQueues] = useState(undefined as ManageQueue[] | undefined);
    const [isLoading, setIsLoading] = useState(true);
    const refresh = () => {
        setIsLoading(true);
        apiGetQueues()
            .then((data) => {
                setQueues(data);
                setIsLoading(false);
            })
            .catch((error) => {
                throw new Error(error);
            });
    }
    useEffect(() => {
        refresh();
    }, [queues]);
    const queueList = queues !== undefined
        ? <QueueList queues={queues} refresh={refresh} />
        : <span>Loading...</span>;
    return (
        <div>{queueList}</div>
    );
}

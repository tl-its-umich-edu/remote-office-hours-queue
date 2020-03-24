import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getQueuesFake as apiGetQueues, addQueueFake as apiAddQueue, removeQueueFake as apiRemoveQueue } from "../services/api";
import { User, ManageQueue } from "../models";
import { RemoveButton, AddButton, ErrorDisplay, LoadingDisplay } from "./common";
import { pageTaskAsync } from "../hooks/useTaskAsync";
import { useAutoRefresh } from "../hooks/useAutoRefresh";

interface QueueListProps {
    queues: ManageQueue[];
    removeQueue: (q: ManageQueue) => void;
    addQueue: () => void;
    disabled: boolean;
}

function QueueList(props: QueueListProps) {
    const queues = props.queues.map((q) => 
        <li className="list-group-item">
            <Link to={`/manage/${q.id}`}>
                {q.id}: {q.name}
            </Link>
            <span className="float-right">
                <RemoveButton remove={() => props.removeQueue(q)} size="sm" disabled={props.disabled}> Delete Queue</RemoveButton>
            </span>
        </li>
    );
    return (
        <div>
            <ul className="list-group">{queues}</ul>
            <AddButton add={() => props.addQueue()} disabled={props.disabled}> Add Queue</AddButton>
        </div>
    );
}

interface ManagePageProps {
    user?: User;
}

export function ManagePage(props: ManagePageProps) {
    const [queues, setQueues] = useState(undefined as ManageQueue[] | undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(undefined as Error | undefined);
    const refresh = () => {
        pageTaskAsync(
            () => apiGetQueues(),
            setQueues,
            setIsLoading,
            setError,
        );
    }
    useEffect(() => {
        refresh();
    }, []);
    const [interactions] = useAutoRefresh(refresh);
    const removeQueue = (q: ManageQueue) => {
        interactions.next(true);
        setIsLoading(true);
        apiRemoveQueue(q.id)
            .then((data) => {
                refresh();
            })
            .catch((error: Error) => {
                console.error(error);
                setError(error);
                setIsLoading(false);
            });
    }
    const addQueue = () => {
        interactions.next(true);
        const name = prompt("Queue name?", "Queueueueueue");
        if (!name) return;
        interactions.next(true);
        setIsLoading(true);
        apiAddQueue(name)
            .then((data) => {
                refresh();
            })
            .catch((error: Error) => {
                console.error(error);
                setError(error);
                setIsLoading(false);
            });
    }
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay error={error}/>
    const queueList = queues !== undefined
        && <QueueList queues={queues} disabled={isLoading} removeQueue={removeQueue} addQueue={addQueue}/>
    return (
        <div>
            {loadingDisplay}
            {errorDisplay}
            {queueList}
        </div>
    );
}

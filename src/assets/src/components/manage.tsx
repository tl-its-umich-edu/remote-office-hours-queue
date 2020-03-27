import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getQueues as apiGetQueues, createQueue as apiAddQueue, deleteQueue as apiRemoveQueue } from "../services/api";
import { User, ManageQueue } from "../models";
import { RemoveButton, AddButton, ErrorDisplay, LoadingDisplay } from "./common";
import { usePromise } from "../hooks/usePromise";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { redirectToLogin } from "../utils";

interface QueueListProps {
    queues: ManageQueue[];
    removeQueue: (q: ManageQueue) => Promise<void>;
    addQueue: () => Promise<void>;
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
    const queueList = queues.length
        ? <ul className="list-group">{queues}</ul>
        : <p>No queues to display. Create a queue by clicking the "Add Queue" button below.</p>
    return (
        <div>
            <h2>My Meeting Queues</h2>
            {queueList}
            <AddButton add={() => props.addQueue()} disabled={props.disabled}> Add Queue</AddButton>
        </div>
    );
}

interface ManagePageProps {
    user?: User;
}

export function ManagePage(props: ManagePageProps) {
    if (!props.user) {
        redirectToLogin()
    }
    const [queues, setQueues] = useState(undefined as ManageQueue[] | undefined);
    const [doRefresh, refreshLoading, refreshError] = usePromise(() => apiGetQueues(), setQueues);
    useEffect(() => {
        doRefresh();
    }, []);
    const [interactions] = useAutoRefresh(doRefresh);
    const removeQueue = async (q: ManageQueue) => {
        console.log(q);
        interactions.next(true);
        await apiRemoveQueue(q.id)
        doRefresh();
    }
    const [doRemoveQueue, removeQueueLoading, removeQueueError] = usePromise(removeQueue)
    const addQueue = async () => {
        interactions.next(true);
        const name = prompt("Queue name?", "Queueueueueue");
        if (!name) return;
        interactions.next(true);
        await apiAddQueue(name);
        doRefresh();
    }
    const [doAddQueue, addQueueLoading, addQueueError] = usePromise(addQueue);
    const isChanging = removeQueueLoading || addQueueLoading;
    const isLoading = refreshLoading || isChanging;
    const error = refreshError || removeQueueError || addQueueError;
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay error={error}/>
    const queueList = queues !== undefined
        && <QueueList queues={queues} disabled={isChanging} removeQueue={doRemoveQueue} addQueue={doAddQueue}/>
    return (
        <div>
            {loadingDisplay}
            {errorDisplay}
            <h1>Virtual Office Hours</h1>
            <p>Create a way for people to wait in line when you hold office hours. You can have multiple queues, add or remove additional hosts, and manage the list of participants in queue.</p>
            {queueList}
        </div>
    );
}

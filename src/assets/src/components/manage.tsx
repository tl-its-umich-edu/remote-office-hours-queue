import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getQueues as apiGetQueues, createQueue as apiAddQueue, deleteQueue as apiRemoveQueue } from "../services/api";
import { User, ManageQueue } from "../models";
import { RemoveButton, ErrorDisplay, LoadingDisplay, SingleInputForm } from "./common";
import { usePromise } from "../hooks/usePromise";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { redirectToLogin } from "../utils";

interface QueueListProps {
    queues: ManageQueue[];
    addQueue: (uniqname: string) => Promise<void>;
    disabled: boolean;
}

function QueueList(props: QueueListProps) {
    const queues = props.queues.map((q) => 
        <li className="list-group-item" key={q.id}>
            <Link to={`/manage/${q.id}`}>
                {q.name}
            </Link>
        </li>
    );
    const queueList = queues.length
        ? <ul className="list-group">{queues}</ul>
        : <p>No queues to display. Create a queue by clicking the "Add Queue" button below.</p>
    return (
        <div>
            <h2>My Meeting Queues</h2>
            {queueList}
            <SingleInputForm 
                placeholder="Queue name..." 
                buttonType="success"
                onSubmit={props.addQueue} 
                disabled={props.disabled}>
                    + Add Queue
            </SingleInputForm>
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
    const addQueue = async (queueName: string) => {
        interactions.next(true);
        if (!queueName) return;
        await apiAddQueue(queueName);
        doRefresh();
    }
    const [doAddQueue, addQueueLoading, addQueueError] = usePromise(addQueue);
    const isChanging = addQueueLoading;
    const isLoading = refreshLoading || isChanging;
    const error = refreshError || addQueueError;
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay error={error}/>
    const queueList = queues !== undefined
        && <QueueList queues={queues} disabled={isChanging} addQueue={doAddQueue}/>
    return (
        <div>
            {loadingDisplay}
            {errorDisplay}
            <h1>Virtual Office Hours</h1>
            <p>Create a way for people to wait in line when you hold office hours. You can have multiple queues, add or remove additional hosts, and manage the list of participants in queue.</p>
            {queueList}
            <hr/>
            <a target="_blank" href="https://documentation.its.umich.edu/node/1830">
                Learn more about using Remote Office Hours Queue as a host
            </a>
        </div>
    );
}

import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import * as api from "../services/api";
import { QueueHost } from "../models";
import { ErrorDisplay, FormError, checkForbiddenError, LoadingDisplay, SingleInputForm, LoginDialog, Breadcrumbs } from "./common";
import { usePromise } from "../hooks/usePromise";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { redirectToLogin } from "../utils";
import { PageProps } from "./page";

interface ManageQueueListProps {
    queues: QueueHost[];
    disabled: boolean;
    onAddQueue: (uniqname: string) => Promise<void>;
}

function ManageQueueList(props: ManageQueueListProps) {
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
            {queueList}
            <SingleInputForm 
                id="add_queue"
                placeholder="Queue name..." 
                buttonType="success"
                onSubmit={props.onAddQueue} 
                disabled={props.disabled}
                allowBlank={true}>
                    + Add Queue
            </SingleInputForm>
        </div>
    );
}

export function ManagePage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }
    const [queues, setQueues] = useState(undefined as QueueHost[] | undefined);
    const [doRefresh, refreshLoading, refreshError] = usePromise(() => api.getQueues(), setQueues);
    useEffect(() => {
        doRefresh();
    }, []);
    const [interactions] = useAutoRefresh(doRefresh);
    const addQueue = async (queueName: string) => {
        interactions.next(true);
        if (!queueName) return;
        await api.createQueue(queueName, new Set(Object.keys(props.backends)));
        doRefresh();
    }
    const [doAddQueue, addQueueLoading, addQueueError] = usePromise(addQueue);
    
    const isChanging = addQueueLoading;
    const isLoading = refreshLoading || isChanging;
    const errorSources = [
        {source: 'Queue Connection', error: refreshError}, 
        {source: 'Add Queue', error: addQueueError}
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = errorSources.some(checkForbiddenError);
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay formErrors={errorSources}/>
    const queueList = queues !== undefined
        && <ManageQueueList queues={queues} disabled={isChanging} onAddQueue={doAddQueue}/>
    return (
        <div>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <Breadcrumbs currentPageTitle="Manage"/>
            {loadingDisplay}
            {errorDisplay}
            <h1>My Meeting Queues</h1>
            <p>Create a way for people to wait in line when you hold office hours. You can have multiple queues, add or remove additional hosts, and manage the list of participants in queue.</p>
            {queueList}
            <hr/>
            <a target="_blank" href="https://documentation.its.umich.edu/node/1830">
                Learn more about using Remote Office Hours Queue as a host
            </a>
        </div>
    );
}

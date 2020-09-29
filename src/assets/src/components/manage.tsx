import * as React from "react";
import { useState } from "react";

import * as api from "../services/api";
import { useUserWebSocket } from "../services/sockets";
import { QueueBase } from "../models";
import { ErrorDisplay, FormError, checkForbiddenError, LoadingDisplay, SingleInputField, LoginDialog, Breadcrumbs, StatelessInputGroupForm } from "./common";
import { usePromise } from "../hooks/usePromise";
import { redirectToLogin } from "../utils";
import { queueTitleSchema } from "../validation";
import { QueueTable } from "./common";
import { PageProps } from "./page";


interface ManageQueueTableProps {
    queues: ReadonlyArray<QueueBase>;
    disabled: boolean;
    onAddQueue: (uniqname: string) => Promise<void>;
}

function ManageQueueTable(props: ManageQueueTableProps) {
    const queueResults = props.queues.length
        ? <QueueTable queues={props.queues} manageLink={true}/>
        : <p>No queues to display. Create a queue by clicking the "Add Queue" button below.</p>
    return (
        <div>
            {queueResults}
            <div className="page-content-flow">
                <SingleInputField
                    id="add_queue"
                    fieldComponent={StatelessInputGroupForm}
                    placeholder="Queue name..."
                    buttonType="success"
                    onSubmit={props.onAddQueue}
                    disabled={props.disabled}
                    fieldSchema={queueTitleSchema}
                    showRemaining={true}
                >
                    + Add Queue
                </SingleInputField>
            </div>
        </div>
    );
}

export function ManagePage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }
    const [queues, setQueues] = useState(undefined as ReadonlyArray<QueueBase> | undefined);
    const userWebSocketError = useUserWebSocket(props.user!.id, (u) => setQueues(u.hosted_queues));

    const addQueue = async (queueName: string) => {
        if (!queueName) return;
        await api.createQueue(queueName, new Set(Object.keys(props.backends)));
    }
    const [doAddQueue, addQueueLoading, addQueueError] = usePromise(addQueue);
    
    const isChanging = addQueueLoading;
    const errorSources = [
        {source: 'User Connection', error: userWebSocketError},
        {source: 'Add Queue', error: addQueueError}
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = errorSources.some(checkForbiddenError);
    const loadingDisplay = <LoadingDisplay loading={isChanging}/>
    const errorDisplay = <ErrorDisplay formErrors={errorSources}/>
    const queueTable = queues !== undefined
        && <ManageQueueTable queues={queues} disabled={isChanging} onAddQueue={doAddQueue}/>
    return (
        <div>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <Breadcrumbs currentPageTitle="Manage"/>
            {loadingDisplay}
            {errorDisplay}
            <h1>My Meeting Queues</h1>
            <p>Create a way for people to wait in line when you hold office hours. You can have multiple queues, add or remove additional hosts, and manage the list of participants in queue.</p>
            {queueTable}
            <hr/>
            <a target="_blank" href="https://documentation.its.umich.edu/node/1830">
                Learn more about using Remote Office Hours Queue as a host
            </a>
        </div>
    );
}

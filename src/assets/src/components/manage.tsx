import * as React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "react-bootstrap";

import { ChangeLog } from "./changeLog";
import { Breadcrumbs, checkForbiddenError, ErrorDisplay, FormError, LoginDialog, QueueTable } from "./common";
import { PageProps } from "./page";
import { useEntityChanges } from "../hooks/useEntityChanges";
import { usePreviousState } from "../hooks/usePreviousState";
import { QueueBase } from "../models";
import { useUserWebSocket } from "../services/sockets";
import { redirectToLogin } from "../utils";


interface ManageQueueTableProps {
    queues: ReadonlyArray<QueueBase>;
    disabled: boolean;
}

function ManageQueueTable(props: ManageQueueTableProps) {
    const queueResults = props.queues.length
        ? <QueueTable queues={props.queues} manageLink={true} />
        : <p>No queues to display. Create a queue by clicking the "Add Queue" button below.</p>;
    return (
        <div>
            {queueResults}
            <div className="mt-3">
                <Link to="/add_queue" tabIndex={-1}>
                    <Button variant='success' aria-label='Add Queue'>+ Add Queue</Button>
                </Link>
            </div>
        </div>
    );
}

export function ManagePage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }

    const [queues, setQueues] = useState(undefined as ReadonlyArray<QueueBase> | undefined);
    const oldQueues = usePreviousState(queues);
    const userWebSocketError = useUserWebSocket(props.user!.id, (u) => setQueues(u.hosted_queues));

    const [queueChangeEvents, compareAndSetChangeEvents, deleteQueueChangeEvent] = useEntityChanges<QueueBase>();
    useEffect(() => {
        if (queues && oldQueues) compareAndSetChangeEvents(oldQueues, queues);
    }, [queues]);

    const errorSources = [
        {source: 'User Connection', error: userWebSocketError}
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = errorSources.some(checkForbiddenError);
    const errorDisplay = <ErrorDisplay formErrors={errorSources} />;
    const queueTable = queues !== undefined
        && <ManageQueueTable queues={queues} disabled={false} />;
    return (
        <div>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <Breadcrumbs currentPageTitle="Manage"/>
            {errorDisplay}
            <h1>My Meeting Queues</h1>
            <p>These are all the queues you are a host of. Select a queue to manage it or add a queue below.</p>
            <ChangeLog changeEvents={queueChangeEvents} deleteChangeEvent={deleteQueueChangeEvent} />
            {queueTable}
            <hr/>
            <a target="_blank" href="https://documentation.its.umich.edu/node/1830">
                Learn more about using Remote Office Hours Queue as a host
            </a>
        </div>
    );
}

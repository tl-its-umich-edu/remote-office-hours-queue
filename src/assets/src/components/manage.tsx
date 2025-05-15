import * as React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "react-bootstrap";

import { Breadcrumbs, checkForbiddenError, ErrorDisplay, FormError, LoginDialog, QueueTable } from "./common";
import { PageProps } from "./page";
import { QueueBase } from "../models";
import { useUserWebSocket } from "../services/sockets";
import { redirectToLogin } from "../utils";
import * as api from "../services/api";
import DownloadQueueHistoryModal from "./DownloadQueueHistoryModal";
import { usePromise } from "../hooks/usePromise";
import { HelmetTitle } from "../title";

interface ManageQueueTableProps {
    queues: ReadonlyArray<QueueBase>;
    disabled: boolean;
    onSingleQueueHistoryDownload?: (queueId: number) => Promise<void>;
    onAllQueueHistoryDownload?: () => Promise<void>;
}

function ManageQueueTable(props: ManageQueueTableProps) {
    const queueResults = props.queues.length
        ? <QueueTable queues={props.queues} manageLink={true} includeCSVDownload={true} handleCSVDownload={props.onSingleQueueHistoryDownload} />
        : <p>No queues to display. Create a queue by clicking the "Add Queue" button below.</p>;
    return (
        <div>
            {queueResults}
            <div className="mt-3">
                <Link to="/add_queue" tabIndex={-1}>
                    <Button disabled={props.disabled} variant='success' aria-label='Add Queue'>+ Add Queue</Button>
                </Link>
                {props.onAllQueueHistoryDownload ? (
                    <DownloadQueueHistoryModal disabled={props.disabled} onDownload={props.onAllQueueHistoryDownload} />
                ) : null}
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
    const [ doExportAllQueues, exportAllLoading, exportAllError ] = usePromise(() => api.exportAllQueueHistoryLogs() as Promise<void>);
    const [ doExportQueue, exportQueueLoading, exportQueueError ] = usePromise((queueId: number) => api.exportQueueHistoryLogs(queueId) as Promise<void>);

    
    const errorSources = [
        {source: 'User Connection', error: userWebSocketError},
        {source: 'Export All Queues', error: exportAllError},
        {source: 'Export Queue', error: exportQueueError},
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = errorSources.some(checkForbiddenError);
    const errorDisplay = <ErrorDisplay formErrors={errorSources}/>
    const queueTable = queues !== undefined
        && <ManageQueueTable 
            queues={queues} 
            disabled={exportAllLoading || exportQueueLoading} 
            onSingleQueueHistoryDownload={doExportQueue}
            onAllQueueHistoryDownload={doExportAllQueues}/>
    return (
        <div>
            <HelmetTitle title="Manage" />
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <Breadcrumbs currentPageTitle="Manage"/>
            {errorDisplay}
            <h1>My Meeting Queues</h1>
            <p>These are all the queues you are a host of. Select a queue to manage it or add a queue below.</p>
            {queueTable}
            <hr/>
            <a target="_blank" href="https://documentation.its.umich.edu/node/1830">
                Learn more about using Remote Office Hours Queue as a host
            </a>
        </div>
    );
}

import * as React from "react";
import { createRef, useState } from "react";
import { Button, Col, Nav, Row, Tab } from "react-bootstrap";
import Dialog from "react-bootstrap-dialog";

import {
    Breadcrumbs, checkForbiddenError, ErrorDisplay, FormError, LoadingDisplay, LoginDialog, showConfirmation
} from "./common";
import { PageProps } from "./page";
import { GeneralEditor, ManageHostsEditor, MultiTabEditorProps } from "./queueEditors";
import { usePromise } from "../hooks/usePromise";
import { QueueAttendee, QueueHost, User, isQueueHost } from "../models";
import * as api from "../services/api";
import { useQueueWebSocket } from "../services/sockets"
import { recordQueueManagementEvent, redirectToLogin } from "../utils";
import { 
    confirmUserExists, queueDescriptSchema, queueNameSchema, ValidationResult, MeetingTypesValidationResult,
    validateAndSetStringResult, validateAndSetMeetingTypesResult
} from "../validation";


type AvailableTabs = 'general' | 'hosts' | 'delete';

const buttonSpacing = 'ml-3'

interface QueueSettingsProps extends MultiTabEditorProps {
    // Shared
    queue: QueueHost;
    activeKey: AvailableTabs;
    // General Tab
    onSaveGeneralClick: () => void;
    onDiscardGeneralClick: () => void;
    // Delete Queue Tab
    onDeleteClick: () => void;
}

function QueueSettingsEditor(props: QueueSettingsProps) {
    return (
        <Tab.Container id='add-queue-editor' defaultActiveKey='general' activeKey={props.activeKey} onSelect={props.onTabSelect}>
            <Row>
                <Col sm={3}>
                    <Nav variant='pills' className='flex-column mt-5'>
                        <Nav.Item><Nav.Link eventKey='general'>General</Nav.Link></Nav.Item>
                        <Nav.Item><Nav.Link eventKey='hosts'>Manage Hosts</Nav.Link></Nav.Item>
                        <Nav.Item><Nav.Link eventKey='delete'>Delete Queue</Nav.Link></Nav.Item>
                    </Nav>
                </Col>
                <Col sm={6}>
                    <h1>Settings</h1>
                    <Tab.Content>
                        <Tab.Pane eventKey='general'>
                            <GeneralEditor {...props} />
                            <div className='mt-4'>
                                <Button
                                    variant='primary'
                                    disabled={props.disabled}
                                    aria-label='Save Changes'
                                    onClick={props.onSaveGeneralClick}
                                >
                                    Save Changes
                                </Button>
                                <Button
                                    variant='light'
                                    className={`text-danger ${buttonSpacing}`}
                                    disabled={props.disabled}
                                    aria-label='Discard Changes'
                                    onClick={props.onDiscardGeneralClick}
                                >
                                    Discard Changes
                                </Button>
                            </div>
                        </Tab.Pane>
                        <Tab.Pane eventKey='hosts'>
                            <ManageHostsEditor {...props} />
                        </Tab.Pane>
                        <Tab.Pane eventKey='delete'>
                            <h2>Delete Queue</h2>
                            <p>Delete the entire queue, including all hosts and current meetings in queue. <strong>This cannot be undone.</strong></p>
                            <div className='mt-4'>
                                <Button variant='danger' disabled={props.disabled} aria-label='Delete Queue' onClick={props.onDeleteClick}>
                                    Delete Queue
                                </Button>
                            </div>
                        </Tab.Pane>
                    </Tab.Content>
                </Col>
            </Row>
        </Tab.Container>
    );
}


interface SettingsPageParams {
    queue_id: string;
}

export function ManageQueueSettingsPage(props: PageProps<SettingsPageParams>) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }

    // Set up page state
    const dialogRef = createRef<Dialog>();
    const [queue, setQueue] = useState(undefined as QueueHost | undefined);
    const [queueInitialized, setQueueInitialized] = useState(false);
    const [authError, setAuthError] = useState(undefined as Error | undefined);

    // Set up WebSocket
    const queueID = props.match.params.queue_id;
    if (queueID === undefined) throw new Error("queueID is undefined!");
    if (!props.user) throw new Error("user is undefined!");
    const queueIDInt = Number(queueID);

    const setQueueChecked = (q: QueueAttendee | QueueHost | undefined) => {
        if (!q) {
            setQueue(q);
        } else if (isQueueHost(q)) {
            setQueue(q);
            setAuthError(undefined);
        } else {
            setQueue(undefined);
            setAuthError(new Error("You are not a host of this queue. If you believe you are seeing this message in error, contact the queue host(s)."));
        }
    }
    const userWebSocketError = useQueueWebSocket(queueIDInt, setQueueChecked);

    const [activeKey, setActiveKey] = useState('general' as AvailableTabs);
    const [showCorrectGeneralMessage, setShowCorrectGeneralMessage] = useState(false);
    const [name, setName] = useState('');
    const [nameValidationResult, setNameValidationResult] = useState(undefined as undefined | ValidationResult);
    const [description, setDescription] = useState('');
    const [descriptValidationResult, setDescriptValidationResult] = useState(undefined as undefined | ValidationResult);
    const [allowedMeetingTypes, setAllowedMeetingTypes] = useState(new Set() as Set<string>);
    const [allowedValidationResult, setAllowedValidationResult] = useState(undefined as undefined | MeetingTypesValidationResult);

    if (queue && !queueInitialized) {
        setQueueInitialized(true);
        setName(queue.name);
        setDescription(queue.description);
        setAllowedMeetingTypes(new Set(queue.allowed_backends));
    }

    const resetValidationResults = () => {
        if (setShowCorrectGeneralMessage) setShowCorrectGeneralMessage(false);
        setNameValidationResult(undefined);
        setDescriptValidationResult(undefined);
        setAllowedValidationResult(undefined);
    }

    // Set up API interactions
    const changeName = async (name: string) => {
        recordQueueManagementEvent("Changed Name");
        return await api.changeQueueName(queue!.id, name);
    }
    const [doChangeName, changeNameLoading, changeNameError] = usePromise(changeName, setQueueChecked);
    const changeDescription = async (description: string) => {
        recordQueueManagementEvent("Changed Description");
        return await api.changeQueueDescription(queue!.id, description);
    }
    const [doChangeDescription, changeDescriptionLoading, changeDescriptionError] = usePromise(changeDescription, setQueueChecked);
    const updateAllowedBackends = async (allowedBackends: Set<string>) => {
        await api.updateAllowedMeetingTypes(queue!.id, allowedBackends);
    }
    const [doUpdateAllowedBackends, updateAllowedMeetingTypesLoading, updateAllowedMeetingTypesError] = usePromise(updateAllowedBackends);

    const removeHost = async (h: User) => {
        recordQueueManagementEvent("Removed Host");
        await api.removeHost(queue!.id, h.id);
    }
    const [doRemoveHost, removeHostLoading, removeHostError] = usePromise(removeHost);
    const confirmRemoveHost = (h: User) => {
        showConfirmation(dialogRef, () => doRemoveHost(h), "Remove Host?", `remove host ${h.username}`);
    }
    const addHost = async (uniqname: string) => {
        const user = await confirmUserExists(uniqname);
        recordQueueManagementEvent("Added Host");
        await api.addHost(queue!.id, user.id);
    }
    const [doAddHost, addHostLoading, addHostError] = usePromise(addHost);

    const removeQueue = async () => {
        recordQueueManagementEvent("Removed Queue");
        await api.deleteQueue(queue!.id);
        location.href = '/manage';
    }
    const [doRemoveQueue, removeQueueLoading, removeQueueError] = usePromise(removeQueue);
    const confirmRemoveQueue = () => {
        showConfirmation(dialogRef, () => doRemoveQueue(), "Delete Queue?", "permanently delete this queue");
    }

    // On change handlers
    const handleNameChange = (newName: string) => {
        setName(newName);
        validateAndSetStringResult(newName, queueNameSchema, setNameValidationResult, true);
    };
    const handleDescriptionChange = (newDescription: string) => {
        setDescription(newDescription);
        validateAndSetStringResult(newDescription, queueDescriptSchema, setDescriptValidationResult, true);
    };
    const handleAllowedChange = (newAllowedBackends: Set<string>) => {
        setAllowedMeetingTypes(newAllowedBackends);
        validateAndSetMeetingTypesResult(newAllowedBackends, setAllowedValidationResult, queue)
    };

    // On click handlers
    const handleSaveGeneralClick = () => {
        const curNameValidationResult = !nameValidationResult
            ? validateAndSetStringResult(name, queueNameSchema, setNameValidationResult, true)
            : nameValidationResult;
        const curDescriptValidationResult = !descriptValidationResult
            ? validateAndSetStringResult(description, queueDescriptSchema, setDescriptValidationResult, true)
            : descriptValidationResult;
        const curAllowedValidationResult = !allowedValidationResult
            ? validateAndSetMeetingTypesResult(allowedMeetingTypes, setAllowedValidationResult, queue)
            : allowedValidationResult;
        if (!curNameValidationResult!.isInvalid && !curDescriptValidationResult!.isInvalid && !curAllowedValidationResult!.isInvalid) {
            if (setShowCorrectGeneralMessage) setShowCorrectGeneralMessage(false);
            if (name !== queue?.name) doChangeName(name);
            if (description !== queue?.description) doChangeDescription(description);
            doUpdateAllowedBackends(allowedMeetingTypes);  // compare using _.isEqual()?
            resetValidationResults();
        } else {
            if (!showCorrectGeneralMessage) setShowCorrectGeneralMessage(true);
        }
    };
    const handleDiscardGeneralClick = () => {
        setName(queue!.name);
        setDescription(queue!.description);
        setAllowedMeetingTypes(new Set(queue!.allowed_backends));
        resetValidationResults();
    }

    // Can this be simplified while still using AvailableTabs?
    const handleTabSelect = (activeKey: string) => {
        if (activeKey === 'general') {
            setActiveKey(activeKey);
        } else if (activeKey === 'hosts') {
            setActiveKey(activeKey);
        } else if (activeKey === 'delete') {
            setActiveKey(activeKey);
        }
    };

    const isChanging = (
        addHostLoading || removeHostLoading || changeNameLoading || changeDescriptionLoading || removeQueueLoading ||
        updateAllowedMeetingTypesLoading
    );
    const globalErrors = [
        {source: 'Access Denied', error: authError},
        {source: 'Queue Connection', error: userWebSocketError},
        {source: 'Queue Name', error: changeNameError}, 
        {source: 'Queue Description', error: changeDescriptionError},
        {source: 'Allowed Meeting Types', error: updateAllowedMeetingTypesError},
        {source: 'Remove Host', error: removeHostError},
        {source: 'Delete Queue', error: removeQueueError} 
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = globalErrors.some(checkForbiddenError);

    const queueSettingsEditor = queue
        ? (
            <QueueSettingsEditor
                queue={queue}
                disabled={isChanging}
                activeKey={activeKey}
                onTabSelect={handleTabSelect}
                name={name}
                nameValidationResult={nameValidationResult}
                onChangeName={handleNameChange}
                description={description}
                descriptValidationResult={descriptValidationResult}
                onChangeDescription={handleDescriptionChange}
                backends={props.backends}
                allowedMeetingTypes={allowedMeetingTypes}
                allowedValidationResult={allowedValidationResult}
                onChangeAllowed={handleAllowedChange}
                showCorrectGeneralMessage={showCorrectGeneralMessage}
                onSaveGeneralClick={handleSaveGeneralClick}
                onDiscardGeneralClick={handleDiscardGeneralClick}
                currentUser={props.user}
                hosts={queue?.hosts}
                onAddHost={doAddHost}
                onRemoveHost={confirmRemoveHost}
                checkHostError={addHostError ? { source: 'Add Host', error: addHostError } : undefined}
                onDeleteClick={confirmRemoveQueue}
            />
        ) : undefined;

    return (
        <div>
            <Dialog ref={dialogRef} />
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <Breadcrumbs
                currentPageTitle='Settings' 
                intermediatePages={[
                    {title: 'Manage', href: '/manage'},
                    {title: queue?.name ?? queueIDInt.toString(), href: `/manage/${queueIDInt}`}
                ]}
            />
            <LoadingDisplay loading={isChanging} />
            <ErrorDisplay formErrors={globalErrors} />
            {queueSettingsEditor}
        </div>
    );
}

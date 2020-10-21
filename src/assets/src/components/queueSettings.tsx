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
import { compareStringArrays, recordQueueManagementEvent, redirectToLogin } from "../utils";
import { 
    confirmUserExists, queueDescriptSchema, queueNameSchema, ValidationResult, MeetingTypesValidationResult,
    validateAndSetStringResult, validateAndSetMeetingTypesResult
} from "../validation";


enum AvailableTabs {
    General = 'general',
    Hosts = 'hosts',
    Delete = 'delete'
}

const buttonSpacing = 'mr-3 mb-3'

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

// The 'tab-custom' role is used to override a default 'tab' role that resulted in tab links not being keyboard accessible.
function QueueSettingsEditor(props: QueueSettingsProps) {
    return (
        <Tab.Container id='add-queue-editor' defaultActiveKey='general' activeKey={props.activeKey} onSelect={props.onTabSelect}>
            <Row>
                <Col md={3} sm={3}>
                    <Nav variant='pills' className='flex-column mt-5'>
                        <Nav.Item>
                            <Nav.Link eventKey='general' role='tab-custom' tabIndex={0} aria-label='General Tab'>
                                General
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey='hosts' role='tab-custom' tabIndex={0} aria-label='Manage Hosts Tab'>
                                Manage Hosts
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey='delete' role='tab-custom' tabIndex={0} aria-label='Delete Queue Tab'>
                                Delete Queue
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                </Col>
                <Col md={6} sm={9}>
                    <h1>Settings</h1>
                    <Tab.Content aria-live='polite'>
                        <Tab.Pane eventKey='general'>
                            <GeneralEditor {...props} />
                            <div className='mt-4'>
                                <Button
                                    variant='primary'
                                    className={buttonSpacing}
                                    disabled={props.disabled}
                                    aria-label='Save Changes'
                                    onClick={props.onSaveGeneralClick}
                                >
                                    Save Changes
                                </Button>
                                <Button
                                    variant='light'
                                    className={'text-danger ' + buttonSpacing}
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
    const [authError, setAuthError] = useState(undefined as Error | undefined);

    // Set up WebSocket
    const queueID = props.match.params.queue_id;
    if (queueID === undefined) throw new Error("queueID is undefined!");
    if (!props.user) throw new Error("user is undefined!");
    const queueIDInt = Number(queueID);

    const [activeKey, setActiveKey] = useState(AvailableTabs.General as AvailableTabs);
    const [showCorrectGeneralMessage, setShowCorrectGeneralMessage] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [name, setName] = useState('');
    const [nameValidationResult, setNameValidationResult] = useState(undefined as undefined | ValidationResult);
    const [description, setDescription] = useState('');
    const [descriptValidationResult, setDescriptValidationResult] = useState(undefined as undefined | ValidationResult);
    const [allowedMeetingTypes, setAllowedMeetingTypes] = useState(new Set() as Set<string>);
    const [allowedValidationResult, setAllowedValidationResult] = useState(undefined as undefined | MeetingTypesValidationResult);

    const setQueueChecked = (q: QueueAttendee | QueueHost | undefined) => {
        if (!q) {
            setQueue(q);
        } else if (isQueueHost(q)) {
            if (!queue) {
                setName(q.name);
                setDescription(q.description);
                setAllowedMeetingTypes(new Set(q.allowed_backends));
            }
            setQueue(q);
            setAuthError(undefined);
        } else {
            setQueue(undefined);
            setAuthError(new Error("You are not a host of this queue. If you believe you are seeing this message in error, contact the queue host(s)."));
        }
    }
    const userWebSocketError = useQueueWebSocket(queueIDInt, setQueueChecked);

    const resetValidationResults = () => {
        if (setShowCorrectGeneralMessage) setShowCorrectGeneralMessage(false);
        setNameValidationResult(undefined);
        setDescriptValidationResult(undefined);
        setAllowedValidationResult(undefined);
    }

    // Set up API interactions
    const updateQueue = async (name?: string, description?: string, allowed_backends?: Set<string>) => {
        recordQueueManagementEvent("Updated Queue Details");
        return await api.updateQueue(queue!.id, name, description, allowed_backends);
    }
    const [doUpdateQueue, updateQueueLoading, updateQueueError] = usePromise(updateQueue, setQueueChecked);

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
        if (showSuccessMessage) setShowSuccessMessage(false);
    };
    const handleDescriptionChange = (newDescription: string) => {
        setDescription(newDescription);
        validateAndSetStringResult(newDescription, queueDescriptSchema, setDescriptValidationResult, true);
        if (showSuccessMessage) setShowSuccessMessage(false);
    };
    const handleAllowedChange = (newAllowedBackends: Set<string>) => {
        setAllowedMeetingTypes(newAllowedBackends);
        validateAndSetMeetingTypesResult(newAllowedBackends, setAllowedValidationResult, queue)
        if (showSuccessMessage) setShowSuccessMessage(false);
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
            const nameForUpdate = name.trim() !== queue?.name ? name : undefined;
            const descriptForUpdate = description.trim() !== queue?.description ? description : undefined;
            const allowedForUpdate = !compareStringArrays(Array.from(allowedMeetingTypes), queue!.allowed_backends)
                ? allowedMeetingTypes : undefined;
            if (nameForUpdate || descriptForUpdate || allowedForUpdate) {
                doUpdateQueue(nameForUpdate, descriptForUpdate, allowedForUpdate);
                setShowSuccessMessage(true);
            }
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

    const handleTabSelect = (eventKey: string) => setActiveKey(AvailableTabs[eventKey as keyof typeof AvailableTabs]);

    const isChanging = updateQueueLoading || addHostLoading || removeHostLoading || removeQueueLoading;
    const globalErrors = [
        {source: 'Access Denied', error: authError},
        {source: 'Queue Connection', error: userWebSocketError},
        {source: 'Update Queue', error: updateQueueError},
        {source: 'Remove Host', error: removeHostError},
        {source: 'Remove Queue', error: removeQueueError}
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = globalErrors.some(checkForbiddenError);

    const queueSettingsEditor = queue
        && (
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
                showSuccessMessage={showSuccessMessage}
                onSaveGeneralClick={handleSaveGeneralClick}
                onDiscardGeneralClick={handleDiscardGeneralClick}
                currentUser={props.user}
                hosts={queue.hosts}
                onAddHost={doAddHost}
                onRemoveHost={confirmRemoveHost}
                checkHostError={addHostError ? { source: 'Add Host', error: addHostError } : undefined}
                onDeleteClick={confirmRemoveQueue}
            />
        );

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

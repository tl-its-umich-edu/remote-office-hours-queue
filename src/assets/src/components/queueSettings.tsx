import * as React from "react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { Button, Col, Nav, Row, Tab } from "react-bootstrap";

import {
    Breadcrumbs, checkForbiddenError, Dialog, ErrorDisplay, FormError, LoadingDisplay, LoginDialog
} from "./common";
import { PageProps } from "./page";
import { GeneralEditor, ManageHostsEditor, MultiTabEditorProps } from "./queueEditors";
import { useDialogState } from "../hooks/useDialogState";
import { usePromise } from "../hooks/usePromise";
import { useMeetingTypesValidation, useStringValidation} from "../hooks/useValidation";
import { QueueAttendee, QueueHost, User, isQueueHost } from "../models";
import * as api from "../services/api";
import { useQueueWebSocket } from "../services/sockets";
import { checkIfSetsAreDifferent, recordQueueManagementEvent, redirectToLogin } from "../utils";
import { confirmUserExists, queueDescriptSchema, queueNameSchema, queueLocationSchema } from "../validation";
import { HelmetTitle } from "./pageTitle";

const buttonSpacing = 'me-3 mb-3';

interface QueueSettingsProps extends MultiTabEditorProps {
    // Shared
    queue: QueueHost;
    // General Tab
    onSaveGeneralClick: () => void;
    onDiscardGeneralClick: () => void;
    // Delete Queue Tab
    onDeleteClick: () => void;
}

// The 'tab-custom' role is used to override a default 'tab' role that resulted in tab links not being keyboard accessible.
function QueueSettingsEditor(props: QueueSettingsProps) {
    return (
        <Tab.Container id='add-queue-editor' defaultActiveKey='general'>
            <Row>
                <Col md={3} sm={3}>
                    <div className='mt-4'>
                        <Link to={`/manage/${props.queue.id}/`}>
                            <FontAwesomeIcon icon={faChevronLeft} /> Back to Queue
                        </Link>
                    </div>
                    <Nav variant='pills' className='flex-column mt-4'>
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
                                    variant='link'
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

export function ManageQueueSettingsPage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }

    // Set up page state
    const { queue_id: queueID } = useParams();
    const [queue, setQueue] = useState(undefined as QueueHost | undefined);
    const [authError, setAuthError] = useState(undefined as Error | undefined);
    const [dialogState, setStateAndOpenDialog] = useDialogState();

    // Set up WebSocket
    if (queueID === undefined) throw new Error("queueID is undefined!");
    if (!props.user) throw new Error("user is undefined!");
    const queueIDInt = Number(queueID);

    const [showCorrectGeneralMessage, setShowCorrectGeneralMessage] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    const [name, setName] = useState('');
    const [nameValidationResult, validateAndSetNameResult, clearNameResult] = useStringValidation(queueNameSchema, true);
    const [description, setDescription] = useState('');
    const [descriptValidationResult, validateAndSetDescriptResult, clearDescriptResult] = useStringValidation(queueDescriptSchema, true);
    const [allowedMeetingTypes, setAllowedMeetingTypes] = useState(new Set() as Set<string>);
    const [allowedValidationResult, validateAndSetAllowedResult, clearAllowedResult] = useMeetingTypesValidation(props.backends, queue);
    const [inpersonLocation, setInpersonLocation] = useState('');
    const [locationValidationResult, validateAndSetLocationResult, clearLocationResult] = useStringValidation(queueLocationSchema, true);

    const setQueueChecked = (q: QueueAttendee | QueueHost | undefined) => {
        if (!q) {
            setQueue(q);
        } else if (isQueueHost(q)) {
            if (!queue) {
                setName(q.name);
                setDescription(q.description);
                setAllowedMeetingTypes(new Set(q.allowed_backends));
                setInpersonLocation(q.inperson_location);
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
        setShowCorrectGeneralMessage(false);
        clearNameResult()
        clearDescriptResult();
        clearAllowedResult();
        clearLocationResult();
    }

    // Set up API interactions
    const updateQueue = async (name?: string, description?: string, inpersonLocation?: string, allowed_backends?: Set<string>) => {
        recordQueueManagementEvent("Updated Queue Details");
        return await api.updateQueue(queue!.id, name, description, inpersonLocation, allowed_backends);
    }
    const [doUpdateQueue, updateQueueLoading, updateQueueError] = usePromise(updateQueue, setQueueChecked);

    const removeHost = async (h: User) => {
        recordQueueManagementEvent("Removed Host");
        await api.removeHost(queue!.id, h.id);
    }
    const [doRemoveHost, removeHostLoading, removeHostError] = usePromise(removeHost);
    const confirmRemoveHost = (h: User) => {
        setStateAndOpenDialog("Remove Host?", `Are you sure you want to remove host ${h.username}?`, () => doRemoveHost(h));
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
        setStateAndOpenDialog("Delete Queue?", "Are you sure you want to permanently delete this queue?", () => doRemoveQueue());
    }

    // On change handlers
    const handleNameChange = (newName: string) => {
        setName(newName);
        validateAndSetNameResult(newName);
        setShowSuccessMessage(false);
    };
    const handleDescriptionChange = (newDescription: string) => {
        setDescription(newDescription);
        validateAndSetDescriptResult(newDescription);
        setShowSuccessMessage(false);
    };
    const handleAllowedChange = (newAllowedBackends: Set<string>) => {
        setAllowedMeetingTypes(newAllowedBackends);
        validateAndSetAllowedResult(newAllowedBackends);
        setShowSuccessMessage(false);
    };

    const handleLocationChange = (newInpersonLocation: string) => {
        setInpersonLocation(newInpersonLocation);
        validateAndSetLocationResult(newInpersonLocation);
        setShowSuccessMessage(false);
    };

    // On click handlers
    const handleSaveGeneralClick = () => {
        const curNameValidationResult = !nameValidationResult ? validateAndSetNameResult(name) : nameValidationResult;
        const curDescriptValidationResult = !descriptValidationResult
            ? validateAndSetDescriptResult(description) : descriptValidationResult;
        const curAllowedValidationResult = !allowedValidationResult
            ? validateAndSetAllowedResult(allowedMeetingTypes) : allowedValidationResult;
        const curLocationValidationResult = !locationValidationResult 
            ? validateAndSetLocationResult(inpersonLocation) : locationValidationResult;
        if (
            !curNameValidationResult.isInvalid && 
            !curDescriptValidationResult.isInvalid && 
            !curAllowedValidationResult.isInvalid && 
            !curLocationValidationResult.isInvalid
        ) {
            const nameForUpdate = name.trim() !== queue?.name ? name : undefined;
            const descriptForUpdate = description.trim() !== queue?.description ? description : undefined;
            const allowedForUpdate = checkIfSetsAreDifferent(new Set(queue!.allowed_backends), allowedMeetingTypes)
                ? allowedMeetingTypes : undefined;
            const locationForUpdate = inpersonLocation.trim() !== queue?.inperson_location ? inpersonLocation : undefined;
            if (nameForUpdate !== undefined || descriptForUpdate !== undefined || allowedForUpdate || locationForUpdate !== undefined) {
                doUpdateQueue(nameForUpdate, descriptForUpdate, locationForUpdate, allowedForUpdate);
                setShowSuccessMessage(true);
            }
            resetValidationResults();
        } else {
            setShowCorrectGeneralMessage(true);
        }
    };
    const handleDiscardGeneralClick = () => {
        setName(queue!.name);
        setDescription(queue!.description);
        setAllowedMeetingTypes(new Set(queue!.allowed_backends));
        setInpersonLocation(queue!.inperson_location);
        resetValidationResults();
    }

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
                inpersonLocation={inpersonLocation}
                locationValidationResult={locationValidationResult}
                onChangeLocation={handleLocationChange}
            />
        );

    return (
        <div>
            <HelmetTitle title="Settings" />
            <Dialog {...dialogState} />
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

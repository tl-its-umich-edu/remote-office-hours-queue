import * as React from "react";
import { useState } from "react";
import { Link } from 'react-router-dom';
import { Button, Col, Nav, Row, Tab } from "react-bootstrap";

import { Breadcrumbs, checkForbiddenError, ErrorDisplay, FormError, LoadingDisplay, LoginDialog } from "./common";
import { PageProps } from "./page";
import { GeneralEditor, ManageHostsEditor, MultiTabEditorProps } from "./queueEditors";
import { usePromise } from "../hooks/usePromise";
import { QueueHost, User } from "../models";
import * as api from "../services/api";
import { recordQueueManagementEvent, redirectToLogin } from "../utils";
import {
    confirmUserExists, MeetingTypesValidationResult, queueDescriptSchema, queueNameSchema, ValidationResult,
    validateAndSetStringResult, validateAndSetMeetingTypesResult
} from "../validation";


enum AvailableTabs {
    General = 'general',
    Hosts = 'hosts'
}

const buttonSpacing = 'mr-3 mb-3'

interface CancelAddButtonProps {
    disabled: boolean;
}

function CancelAddButton (props: CancelAddButtonProps) {
    return (
        <Link to='/manage/'>
            <Button variant='link' className={'text-danger ' + buttonSpacing} aria-label='Cancel' disabled={props.disabled}>
                Cancel
            </Button>
        </Link>
    );
}


interface AddQueueEditorProps extends MultiTabEditorProps {
    // Shared
    activeKey: AvailableTabs;
    // General Tab
    onGeneralNextClick: () => void;
    // Manage Hosts Tab
    checkHostError?: FormError;
    onBackClick: () => void;
    onFinishClick: () => void;
}

// The 'tab-custom' role is used to override a default 'tab' role that resulted in tab links not being keyboard accessible.
function AddQueueEditor(props: AddQueueEditorProps) {
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
                    </Nav>
                </Col>
                <Col md={6} sm={9}>
                    <h1>Add Queue</h1>
                    <Tab.Content aria-live='polite'>
                        <Tab.Pane eventKey='general'>
                            <GeneralEditor {...props} />
                            <div className='mt-4'>
                                <Button
                                    variant='primary'
                                    className={buttonSpacing}
                                    aria-label='Next'
                                    disabled={props.disabled}
                                    onClick={props.onGeneralNextClick}
                                >
                                    Next
                                </Button>
                                <CancelAddButton disabled={props.disabled} />
                            </div>
                        </Tab.Pane>
                        <Tab.Pane eventKey='hosts'>
                            <ManageHostsEditor {...props} />
                            <div className='mt-4'>
                                <Button
                                    variant='primary'
                                    className={buttonSpacing}
                                    aria-label='Back'
                                    disabled={props.disabled}
                                    onClick={props.onBackClick}
                                >
                                    Back
                                </Button>
                                <Button
                                    variant='primary'
                                    className={buttonSpacing}
                                    aria-label='Finish Adding Queue'
                                    disabled={props.disabled}
                                    onClick={props.onFinishClick}
                                >
                                    Finish Adding Queue
                                </Button>
                                <CancelAddButton disabled={props.disabled} />
                            </div>
                        </Tab.Pane>
                    </Tab.Content>
                </Col>
            </Row>
        </Tab.Container>
    );
}

export function AddQueuePage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }

    // Set up page state
    const [activeKey, setActiveKey] = useState(AvailableTabs.General as AvailableTabs);
    const [showCorrectGeneralMessage, setShowCorrectGeneralMessage] = useState(false);
    const [name, setName] = useState('');
    const [nameValidationResult, setNameValidationResult] = useState(undefined as undefined | ValidationResult);
    const [description, setDescription] = useState('');
    const [descriptValidationResult, setDescriptValidationResult] = useState(undefined as undefined | ValidationResult);
    const [allowedMeetingTypes, setAllowedMeetingTypes] = useState(new Set() as Set<string>);
    const [allowedValidationResult, setAllowedValidationResult] = useState(undefined as undefined | MeetingTypesValidationResult);

    const [hosts, setHosts] = useState([props.user] as User[]);

    // Set up API interactions
    const checkHost = async (uniqname: string): Promise<User> => {
        return await confirmUserExists(uniqname);
    }
    const [doCheckHost, checkHostLoading, checkHostError] = usePromise(
        checkHost,
        (value: User) => setHosts([...hosts].concat(value))
    );

    const addQueue = async (
        queueName: string, allowedBackends: Set<string>, queueDescription: string, hosts: User[]
    ): Promise<QueueHost> => {
        return await api.createQueue(queueName, allowedBackends, queueDescription, hosts);
    };
    const [doAddQueue, addQueueLoading, addQueueError] = usePromise(
        addQueue,
        (queue: QueueHost) => {
            recordQueueManagementEvent('Added Queue');
            queue.hosts.map(h => recordQueueManagementEvent('Added Host'));
            location.href = `/manage/${queue.id}/`;
        }
    );

    // On change handlers
    const handleNameChange = (newName: string) => {
        setName(newName);
        validateAndSetStringResult(newName, queueNameSchema, setNameValidationResult, true);
    };
    const handleDescriptionChange = (newDescription: string) => {
        setDescription(newDescription);
        validateAndSetStringResult(newDescription, queueDescriptSchema, setDescriptValidationResult);
    };
    const handleAllowedChange = (newAllowedBackends: Set<string>) => {
        setAllowedMeetingTypes(newAllowedBackends);
        validateAndSetMeetingTypesResult(newAllowedBackends, setAllowedValidationResult);
    };

    // On click handlers
    const handleHostRemoveClick = (host: User) => setHosts(hosts.filter((user: User) => user.id !== host.id));

    const handleGeneralNextClick = () => {
        const curNameValidationResult = !nameValidationResult
            ? validateAndSetStringResult(name, queueNameSchema, setNameValidationResult, true)
            : nameValidationResult;
        const curDescriptValidationResult = !descriptValidationResult
            ? validateAndSetStringResult(description, queueDescriptSchema, setDescriptValidationResult, true)
            : descriptValidationResult;
        const curAllowedValidationResult = !allowedValidationResult
            ? validateAndSetMeetingTypesResult(allowedMeetingTypes, setAllowedValidationResult)
            : allowedValidationResult;
        if (!curNameValidationResult!.isInvalid && !curDescriptValidationResult!.isInvalid && !curAllowedValidationResult!.isInvalid) {
            setActiveKey(AvailableTabs.Hosts);
            if (setShowCorrectGeneralMessage) setShowCorrectGeneralMessage(false);
        } else {
            if (!showCorrectGeneralMessage) setShowCorrectGeneralMessage(true);
        }
    };

    const handleTabSelect = (eventKey: string) => {
        if (eventKey === AvailableTabs.General) {
            setActiveKey(AvailableTabs.General);
        } else if (eventKey === AvailableTabs.Hosts) {
            handleGeneralNextClick();  // Use same logic as Next button click handler
        }
    };

    const handleManageHostsFinishClick = () => {
        if (name !== '' && allowedMeetingTypes.size !== 0) {
            doAddQueue(name, allowedMeetingTypes, description, hosts);
        } else {
            throw Error('Attempted to pass invalid data to API for queue creation');
        }
    };

    const isChanging = checkHostLoading || addQueueLoading;
    const globalErrors = [
        {source: 'Add Queue', error: addQueueError}
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = globalErrors.some(checkForbiddenError);

    return (
        <div>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <Breadcrumbs currentPageTitle='Add Queue' />
            <LoadingDisplay loading={isChanging} />
            <ErrorDisplay formErrors={globalErrors} />
            <AddQueueEditor
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
                onGeneralNextClick={handleGeneralNextClick}
                currentUser={props.user}
                hosts={hosts}
                addHostTextPrefix='You were added to the list of pending hosts automatically.'
                onAddHost={doCheckHost}
                onRemoveHost={handleHostRemoveClick}
                checkHostError={checkHostError ? { source: 'Check Host', error: checkHostError } : undefined}
                onBackClick={() => setActiveKey(AvailableTabs.General)}
                onFinishClick={handleManageHostsFinishClick}
            />
        </div>
    );
}

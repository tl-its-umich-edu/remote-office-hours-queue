import * as React from "react";
import { useState } from "react";
import { Alert, Button, Col, ListGroup, Nav, Row, Tab } from "react-bootstrap";
import { StringSchema } from "yup";

import {
    Breadcrumbs, checkForbiddenError, ErrorDisplay, FormError, LoadingDisplay, LoginDialog, RemoveButton,
    SingleInputField, StatelessInputGroupForm, StatelessTextAreaForm, UserDisplay
} from "./common";
import { PageProps } from "./page";
import { AllowedBackendsForm } from "./meetingType";
import { usePromise } from "../hooks/usePromise";
import { QueueHost, User } from "../models";
import * as api from "../services/api";
import { recordQueueManagementEvent, redirectToLogin } from "../utils";
import {
    confirmUserExists, queueDescriptSchema, queueNameSchema, uniqnameSchema, ValidationResult, validateString
} from "../validation";


interface CancelAddButtonProps {
    disabled: boolean;
}

function CancelAddButton (props: CancelAddButtonProps) {
    return (
        <Button className='ml-3' href='/manage/' variant='danger' disabled={props.disabled} aria-label='Cancel'>
            Cancel
        </Button>
    );
}


interface AddQueueTabProps {
    disabled: boolean;
    onSubmit: () => void;
}

interface GeneralTabProps extends AddQueueTabProps {
    onChangeName: (value: string) => void;
    onChangeDescription: (value: string) => void;
    backends: {[backend_type: string]: string};
    onChangeAllowed: (allowed: Set<string>) => void;
}

function GeneralTab(props: GeneralTabProps) {
    const [name, setName] = useState('');
    const [nameValidationResult, setNameValidationResult] = useState(undefined as undefined | ValidationResult);

    const [description, setDescription] = useState('');
    const [descriptValidationResult, setDescriptValidationResult] = useState(undefined as undefined | ValidationResult);

    const [allowedMeetingTypes, setAllowedMeetingTypes] = useState(new Set() as Set<string>);
    const [allowedIsInvalid, setAllowedIsInvalid] = useState(undefined as undefined | boolean);

    function validateSomething (
        someValue: string,
        schema: StringSchema,
        someSetter: React.Dispatch<React.SetStateAction<undefined | ValidationResult>>,
    ): ValidationResult {
        const validationResult = validateString(someValue, schema, true);
        someSetter(validationResult);
        return validationResult;
    }

    const validateMeetingTypes = (allowedBackends: Set<string>): boolean => {
        const isInvalid = allowedBackends.size === 0;
        setAllowedIsInvalid(isInvalid);
        return isInvalid;
    }

    const handleNextClick = (e: any) => {
        let curNameValidationResult = nameValidationResult;
        let curDescriptValidationResult = descriptValidationResult;
        let curAllowedIsInvalid = allowedIsInvalid;
        if (!nameValidationResult) {
            curNameValidationResult = validateSomething(name, queueNameSchema, setNameValidationResult);
        }
        if (!descriptValidationResult) {
            curDescriptValidationResult = validateSomething(description, queueDescriptSchema, setDescriptValidationResult);
        }
        if (allowedIsInvalid === undefined) {
            curAllowedIsInvalid = validateMeetingTypes(allowedMeetingTypes);
        }
        if (!curNameValidationResult!.isInvalid && !curDescriptValidationResult!.isInvalid && curAllowedIsInvalid === false) {
            props.onChangeName(name);
            props.onChangeDescription(description);
            props.onChangeAllowed(allowedMeetingTypes);
            props.onSubmit();
        }
    };

    return (
        <div>
            <h2>General</h2>
            <h3>Name</h3>
            <StatelessInputGroupForm
                id='name'
                value={name}
                placeholder='Queue name...'
                disabled={props.disabled}
                isInvalid={nameValidationResult ? nameValidationResult.isInvalid : undefined}
                feedbackMessages={nameValidationResult ? nameValidationResult.messages : []}
                onChangeValue={(newName: string) => {
                    setName(newName);
                    validateSomething(newName, queueNameSchema, setNameValidationResult);
                }}
            />
            <h3>Description</h3>
            <StatelessTextAreaForm
                id='description'
                value={description}
                placeholder='Queue description...'
                disabled={props.disabled}
                isInvalid={descriptValidationResult ? descriptValidationResult.isInvalid : undefined}
                feedbackMessages={descriptValidationResult ? descriptValidationResult.messages : []}
                onChangeValue={(newDescription: string) => {
                    setDescription(newDescription);
                    validateSomething(newDescription, queueDescriptSchema, setDescriptValidationResult);
                }}
            />
            <h3>Meeting Types</h3>
            {allowedIsInvalid ? <Alert variant='danger'>You must select at least one allowed meeting type.</Alert> : undefined}
            <AllowedBackendsForm
                allowed={allowedMeetingTypes}
                backends={props.backends}
                onChange={(allowedBackends) => {
                    setAllowedMeetingTypes(allowedBackends);
                    validateMeetingTypes(allowedBackends);
                }}
                disabled={props.disabled}
            />
            <div className='mt-4'>
                <Button variant='primary' disabled={props.disabled} onClick={handleNextClick}>Next</Button>
                <CancelAddButton disabled={props.disabled} />
            </div>
        </div>
    );
}

interface ManageHostsTabProps extends AddQueueTabProps {
    currentUser?: User;
    hosts: User[];
    onNewHost: (username: string) => void;
    onChangeHosts: (hosts: User[]) => void;
}

function ManageHostsTab(props: ManageHostsTabProps) {
    const hostUsernames = props.hosts.map(h => h.username);
    const filterOutHost = (host: User) => props.hosts.filter((user: User) => user.id !== host.id);
    const hostsSoFar = props.hosts.map((host, key) => (
        <ListGroup.Item key={key}>
            <UserDisplay user={host} />
            <div className='float-right'>
                <RemoveButton
                    onRemove={() => props.onChangeHosts(filterOutHost(host))}
                    size='sm'
                    disabled={props.disabled || host.id === props.currentUser?.id}
                    screenReaderLabel='Remove Host'
                />
            </div>
        </ListGroup.Item>
    ));

    return (
        <div>
            <h2>Manage Hosts</h2>
            <h3>Add Hosts</h3>
            <p>
                You have been added to the list of hosts automatically. (You cannot remove yourself as a host.) Add additional hosts here.
            </p>
            <Alert variant='primary'>
                <strong>Note:</strong> The person you want to add needs to have logged on to Remote Office Hours Queue
                at least once in order to be added.
            </Alert>
            <SingleInputField
                id="add_host"
                fieldComponent={StatelessInputGroupForm}
                placeholder="Uniqname..."
                buttonType='success'
                onSubmit={(username) => {
                    if (!hostUsernames.includes(username)) {
                        props.onNewHost(username)
                    }
                }}
                disabled={props.disabled}
                fieldSchema={uniqnameSchema}
                showRemaining={false}
            >
                + Add Host
            </SingleInputField>
            <h3>Current Hosts</h3>
            <ListGroup>{hostsSoFar}</ListGroup>
            <div className='mt-4'>
                <Button variant='primary' disabled={props.disabled} onClick={props.onSubmit} aria-label='Next'>
                    Finish Adding Queue
                </Button>
                <CancelAddButton disabled={props.disabled} />
            </div>
        </div>
    );
}


interface AddQueueEditorProps {
    disabled: boolean;
    onChangeName: (value: string) => void;
    onChangeDescription: (value: string) => void;
    backends: {[backend_type: string]: string};
    onChangeAllowed: (allowed: Set<string>) => void;
    currentUser?: User;
    hosts: User[];
    onNewHost: (username: string) => void;
    onChangeHosts: (hosts: User[]) => void;
    onTabsSuccess: () => void;
}

// https://react-bootstrap.github.io/components/tabs/#tabs-custom-layout
function AddQueueEditor(props: AddQueueEditorProps) {
    // Would like to use an enum or CV here, not sure I can with onSelect
    const [activeKey, setActiveKey] = useState('general' as string);
    const [navMessage, setNavMessage] = useState(null as string | null);

    const finishTabMessage = 'You must finish the current tab before proceeding to the next.'

    return (
        <Tab.Container
            id='add-queue-editor'
            defaultActiveKey='general'
            activeKey={activeKey}
            onSelect={(eventKey: string) => eventKey !== 'hosts' ? setActiveKey(eventKey) : setNavMessage(finishTabMessage)}
        >
            <Row>
                <Col sm={3}>
                    <Nav variant='pills' className='flex-column mt-5'>
                        <Nav.Item><Nav.Link eventKey='general' tabIndex={0}>General</Nav.Link></Nav.Item>
                        <Nav.Item><Nav.Link eventKey='hosts' tabIndex={0}>Manage Hosts</Nav.Link></Nav.Item>
                    </Nav>
                </Col>
                <Col sm={6}>
                    <h1>Add Queue</h1>
                    {navMessage ? <Alert variant='danger'>{navMessage}</Alert> : null}
                    <Tab.Content>
                        <Tab.Pane eventKey='general'>
                            <GeneralTab
                                disabled={props.disabled}
                                onChangeDescription={props.onChangeDescription}
                                onChangeName={props.onChangeName}
                                backends={props.backends}
                                onChangeAllowed={props.onChangeAllowed}
                                onSubmit={() => {
                                    setActiveKey('hosts');
                                    if (navMessage) { setNavMessage(null) };
                                }}
                            />
                        </Tab.Pane>
                        <Tab.Pane eventKey='hosts'>
                            <ManageHostsTab
                                disabled={props.disabled}
                                currentUser={props.currentUser}
                                hosts={props.hosts}
                                onNewHost={props.onNewHost}
                                onChangeHosts={props.onChangeHosts}
                                onSubmit={props.onTabsSuccess}
                            />
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

    // Final state to be used by API interactions (already validated in child components)
    const [name, setName] = useState(undefined as undefined | string);
    const [description, setDescription] = useState('');
    const [allowedMeetingTypes, setAllowedMeetingTypes] = useState(undefined as undefined | Set<string>);
    const [hosts, setHosts] = useState([props.user] as User[]);

    const checkHost = async (uniqname: string): Promise<User> => {
        return await confirmUserExists(uniqname);
    }
    const [doCheckHost, checkHostLoading, checkHostError] = usePromise(
        checkHost,
        (value: User) => setHosts([...hosts].concat(value))
    );

    // Set up interactions
    const addQueue = async (
        queueName: string, allowedBackends: Set<string>, queueDescription: string, hosts: User[]
    ): Promise<QueueHost> => {
        return await api.createQueue(queueName, allowedBackends, queueDescription, hosts);
    }
    const [doAddQueue, addQueueLoading, addQueueError] = usePromise(
        addQueue,
        (queue: QueueHost) => {
            recordQueueManagementEvent('Added Queue');
            queue.hosts.map(h => recordQueueManagementEvent('Added Host'));
            location.href = `/manage/${queue.id}/`;
        }
    );

    const isChanging = checkHostLoading || addQueueLoading;
    const errorSources = [
        {source: 'Add Queue', error: addQueueError},
        {source: 'Check User', error: checkHostError}
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = errorSources.some(checkForbiddenError);

    return (
        <div>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <Breadcrumbs currentPageTitle='Add Queue' />
            <LoadingDisplay loading={isChanging} />
            <ErrorDisplay formErrors={errorSources} />
            <AddQueueEditor
                disabled={isChanging}
                onChangeDescription={setDescription}
                onChangeName={setName}
                backends={props.backends}
                onChangeAllowed={setAllowedMeetingTypes}
                currentUser={props.user}
                hosts={hosts}
                onNewHost={doCheckHost}
                onChangeHosts={setHosts}
                onTabsSuccess={() => {
                    if (name !== undefined && allowedMeetingTypes !== undefined) {
                        doAddQueue(name, allowedMeetingTypes, description, hosts);
                    } else {
                        throw Error('Application attempted to pass invalid data to API for queue creation.')
                    }
                }}
            />
        </div>
    );
}

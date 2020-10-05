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


const buttonSpacing = 'ml-3'
const requiredSymbol = <span className='text-danger'>*</span>;

interface CancelAddButtonProps {
    disabled: boolean;
}

function CancelAddButton (props: CancelAddButtonProps) {
    return (
        <Button variant='light' className={`text-danger ${buttonSpacing}`} aria-label='Cancel' href='/manage/' disabled={props.disabled}>
            Cancel
        </Button>
    );
}

interface AddQueueTabProps {
    disabled: boolean;
}

interface GeneralTabProps extends AddQueueTabProps {
    name: string;
    nameValidationResult?: ValidationResult;
    onChangeName: (value: string) => void;
    description: string;
    descriptValidationResult?: ValidationResult;
    onChangeDescription: (value: string) => void;
    backends: {[backend_type: string]: string};
    allowedMeetingTypes: Set<string>;
    allowedIsInvalid?: boolean;
    onChangeAllowed: (allowed: Set<string>) => void;
    onNext: () => void;
}

function GeneralTab(props: GeneralTabProps) {
    return (
        <div>
            <h2>General</h2>
            <p>{requiredSymbol} indicates a required field.</p>
            <h3>Name {requiredSymbol}</h3>
            <StatelessInputGroupForm
                id='name'
                value={props.name}
                placeholder='Queue name...'
                disabled={props.disabled}
                isInvalid={props.nameValidationResult ? props.nameValidationResult.isInvalid : undefined}
                feedbackMessages={props.nameValidationResult ? props.nameValidationResult.messages : []}
                onChangeValue={props.onChangeName}
            />
            <h3>Description</h3>
            <StatelessTextAreaForm
                id='description'
                value={props.description}
                placeholder='Queue description...'
                disabled={props.disabled}
                isInvalid={props.descriptValidationResult ? props.descriptValidationResult.isInvalid : undefined}
                feedbackMessages={props.descriptValidationResult ? props.descriptValidationResult.messages : []}
                onChangeValue={props.onChangeDescription}
            />
            <h3>Meeting Types {requiredSymbol}</h3>
            <p>Allow the following meeting types (select at least one):</p>
            {props.allowedIsInvalid ? <Alert variant='danger'>You must select at least one allowed meeting type.</Alert> : undefined}
            <AllowedBackendsForm
                allowed={props.allowedMeetingTypes}
                backends={props.backends}
                onChange={props.onChangeAllowed}
                disabled={props.disabled}
            />
            <div className='mt-4'>
                <Button variant='primary' disabled={props.disabled} onClick={props.onNext}>Next</Button>
                <CancelAddButton disabled={props.disabled} />
            </div>
        </div>
    );
}

interface ManageHostsTabProps extends AddQueueTabProps {
    currentUser?: User;
    hosts: User[];
    onNewHost: (username: string) => void;
    checkHostError?: FormError;
    onChangeHosts: (hosts: User[]) => void;
    onFinish: () => void;
    onBack: () => void;
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
                You have been added to the list of hosts automatically. Add additional hosts here.
                (You cannot remove yourself as a host.)
            </p>
            <Alert variant='primary'>
                <strong>Note:</strong> The person you want to add needs to have logged on to Remote Office Hours Queue
                at least once in order to be added.
            </Alert>
            {props.checkHostError ? <ErrorDisplay formErrors={[props.checkHostError]} /> : undefined}
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
                <Button variant='primary' aria-label='Back' disabled={props.disabled} onClick={props.onBack}>
                    Back
                </Button>
                <Button
                    variant='primary'
                    className={buttonSpacing}
                    aria-label='Finish Adding Queue'
                    disabled={props.disabled}
                    onClick={props.onFinish}
                >
                    Finish Adding Queue
                </Button>
                <CancelAddButton disabled={props.disabled} />
            </div>
        </div>
    );
}

interface AddQueueEditorProps {
    // Shared
    disabled: boolean;
    activeKey: string;
    onTabSelect: (eventKey: string) => void;
    // General Tab
    name: string;
    nameValidationResult?: ValidationResult;
    onChangeName: (value: string) => void;
    description: string;
    descriptValidationResult?: ValidationResult;
    onChangeDescription: (value: string) => void;
    backends: {[backend_type: string]: string};
    allowedMeetingTypes: Set<string>;
    allowedIsInvalid?: boolean;
    onChangeAllowed: (allowed: Set<string>) => void;
    onGeneralNextClick: () => void;
    // Manage Hosts Tab
    currentUser?: User;
    hosts: User[];
    onNewHost: (username: string) => void;
    checkHostError?: FormError;
    onChangeHosts: (hosts: User[]) => void;
    onBackClick: () => void;
    onFinishClick: () => void;
}

// https://react-bootstrap.github.io/components/tabs/#tabs-custom-layout
function AddQueueEditor(props: AddQueueEditorProps) {
    return (
        <Tab.Container id='add-queue-editor' defaultActiveKey='general' activeKey={props.activeKey} onSelect={props.onTabSelect}>
            <Row>
                <Col sm={3}>
                    <Nav variant='pills' className='flex-column mt-5'>
                        <Nav.Item><Nav.Link eventKey='general'>General</Nav.Link></Nav.Item>
                        <Nav.Item><Nav.Link eventKey='hosts'>Manage Hosts</Nav.Link></Nav.Item>
                    </Nav>
                </Col>
                <Col sm={6}>
                    <h1>Add Queue</h1>
                    <Tab.Content>
                        <Tab.Pane eventKey='general'>
                            <GeneralTab
                                disabled={props.disabled}
                                name={props.name}
                                nameValidationResult={props.nameValidationResult}
                                onChangeName={props.onChangeName}
                                description={props.description}
                                descriptValidationResult={props.descriptValidationResult}
                                onChangeDescription={props.onChangeDescription}
                                backends={props.backends}
                                allowedMeetingTypes={props.allowedMeetingTypes}
                                allowedIsInvalid={props.allowedIsInvalid}
                                onChangeAllowed={props.onChangeAllowed}
                                onNext={props.onGeneralNextClick}
                            />
                        </Tab.Pane>
                        <Tab.Pane eventKey='hosts'>
                            <ManageHostsTab
                                disabled={props.disabled}
                                currentUser={props.currentUser}
                                hosts={props.hosts}
                                onNewHost={props.onNewHost}
                                checkHostError={props.checkHostError}
                                onChangeHosts={props.onChangeHosts}
                                onBack={props.onBackClick}
                                onFinish={props.onFinishClick}
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

    // Set up page state
    const [activeKey, setActiveKey] = useState('general');

    const [name, setName] = useState('');
    const [nameValidationResult, setNameValidationResult] = useState(undefined as undefined | ValidationResult);
    const [description, setDescription] = useState('');
    const [descriptValidationResult, setDescriptValidationResult] = useState(undefined as undefined | ValidationResult);
    const [allowedMeetingTypes, setAllowedMeetingTypes] = useState(new Set() as Set<string>);
    const [allowedIsInvalid, setAllowedIsInvalid] = useState(undefined as undefined | boolean);

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

    // Validation functions
    type ValidationResultSetter = React.Dispatch<React.SetStateAction<undefined | ValidationResult>>;
    function validateSomething (someValue: string, schema: StringSchema, someSetter: ValidationResultSetter): ValidationResult {
        const validationResult = validateString(someValue, schema, true);
        someSetter(validationResult);
        return validationResult;
    };
    const validateMeetingTypes = (allowedBackends: Set<string>): boolean => {
        const isInvalid = allowedBackends.size === 0;
        setAllowedIsInvalid(isInvalid);
        return isInvalid;
    };

    // On change handlers
    const handleNameChange = (newName: string) => {
        setName(newName);
        validateSomething(newName, queueNameSchema, setNameValidationResult);
    };
    const handleDescriptionChange = (newDescription: string) => {
        setDescription(newDescription);
        validateSomething(newDescription, queueDescriptSchema, setDescriptValidationResult);
    };
    const handleAllowedChange = (newAllowedBackends: Set<string>) => {
        setAllowedMeetingTypes(newAllowedBackends);
        validateMeetingTypes(newAllowedBackends);
    };

    // On click handlers
    const handleGeneralNextClick = () => {
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
            setActiveKey('hosts');
        }
    };

    // Improve this?
    const handleManageHostsFinishClick = () => {
        if (name !== '' && allowedMeetingTypes.size !== 0) {
            doAddQueue(name, allowedMeetingTypes, description, hosts);
        } else {
            throw Error('Attempted to pass invalid data to API for queue creation')
        }
    };
    const handleTabSelect = (activeKey: string) => {
        if (activeKey === 'general') {
            setActiveKey(activeKey);
        } else if (activeKey === 'hosts') {
            handleGeneralNextClick();  // Use same logic as Next button click handler
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
                allowedIsInvalid={allowedIsInvalid}
                onChangeAllowed={handleAllowedChange}
                onGeneralNextClick={handleGeneralNextClick}
                currentUser={props.user}
                hosts={hosts}
                onNewHost={doCheckHost}
                checkHostError={checkHostError ? { source: 'Check Host', error: checkHostError } : undefined}
                onChangeHosts={setHosts}
                onBackClick={() => setActiveKey('general')}
                onFinishClick={handleManageHostsFinishClick}
            />
        </div>
    );
}

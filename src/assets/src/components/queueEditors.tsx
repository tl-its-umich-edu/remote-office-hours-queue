import * as React from "react";
import { Alert, ListGroup } from "react-bootstrap";

import {
    ErrorDisplay, FormError, RemoveButton, SingleInputField, StatelessInputGroupForm, StatelessTextAreaForm,
    UserDisplay, userLoggedOnWarning
} from "./common";
import { AllowedBackendsForm } from "./meetingType";
import { MeetingBackend, User } from "../models";
import { MeetingTypesValidationResult, uniqnameSchema, ValidationResult } from "../validation";


const requiredSymbol = <span className='text-danger'>*</span>;

interface QueueEditorProps {
    disabled: boolean;
}

interface GeneralEditorProps extends QueueEditorProps {
    name: string;
    nameValidationResult?: ValidationResult;
    onChangeName: (value: string) => void;
    description: string;
    descriptValidationResult?: ValidationResult;
    onChangeDescription: (value: string) => void;
    backends: MeetingBackend[];
    allowedMeetingTypes: Set<string>;
    allowedValidationResult?: MeetingTypesValidationResult;
    onChangeAllowed: (allowed: Set<string>) => void;
    showCorrectGeneralMessage: boolean;
    showSuccessMessage?: boolean;
    queueLocation: string;
    locationValidationResult?: ValidationResult;
    onChangeLocation: (value: string) => void;
}

export function GeneralEditor(props: GeneralEditorProps) {
    const correctMessage = 'Please correct the invalid entries below in order to proceed.';
    const successMessage = 'Your changes were saved successfully!';

    const allowedFeedbackMessages = props.allowedValidationResult?.isInvalid
        ? props.allowedValidationResult.messages.map((m, key) => <Alert key={key} variant='danger'>{m}</Alert>)
        : undefined;

    return (
        <div>
            <h2>General</h2>
            {props.showSuccessMessage ? <Alert variant='success'>{successMessage}</Alert> : undefined}
            {props.showCorrectGeneralMessage ? <Alert variant='danger'>{correctMessage}</Alert> : undefined}
            <p>{requiredSymbol} indicates a required field.</p>
            <h3>Name {requiredSymbol}</h3>
            <StatelessInputGroupForm
                id='name'
                value={props.name}
                formLabel='Queue Name'
                placeholder='Queue name...'
                disabled={props.disabled}
                validationResult={props.nameValidationResult}
                onChangeValue={props.onChangeName}
            />
            <h3>Description</h3>
            <StatelessTextAreaForm
                id='description'
                value={props.description}
                formLabel='Queue Description'
                placeholder='Queue description...'
                disabled={props.disabled}
                validationResult={props.descriptValidationResult}
                onChangeValue={props.onChangeDescription}
            />
            <h3>Meeting Types {requiredSymbol}</h3>
            <p>Allow the following meeting types (select at least one):</p>
            <div>{allowedFeedbackMessages}</div>
            <AllowedBackendsForm
                allowed={props.allowedMeetingTypes}
                backends={props.backends}
                onChange={props.onChangeAllowed}
                disabled={props.disabled}
            />
            {props.allowedMeetingTypes.has('inperson') && 
                <StatelessInputGroupForm 
                    id='queueLocation'
                    value={props.queueLocation}
                    formLabel='Queue Location'
                    placeholder='Queue location...'
                    disabled={props.disabled}
                    validationResult={props.locationValidationResult}
                    onChangeValue={props.onChangeLocation}
                />
            }
        </div>
    );
}

interface ManageHostsEditorProps extends QueueEditorProps {
    currentUser?: User;
    hosts: User[];
    addHostTextPrefix?: string;
    onAddHost: (username: string) => void;
    onRemoveHost: (user: User) => void;
    checkHostError?: FormError;
}

export function ManageHostsEditor(props: ManageHostsEditorProps) {
    const hostUsernames = props.hosts.map(h => h.username);

    const hostsSoFar = props.hosts.map((host, key) => (
        <ListGroup.Item key={key}>
            <UserDisplay user={host} />
            {
                (host.id !== props.currentUser?.id)
                    && (
                        <div className='float-right'>
                            <RemoveButton
                                onRemove={() => props.onRemoveHost(host)}
                                size='sm'
                                disabled={props.disabled}
                                screenReaderLabel='Remove Host'
                            />
                        </div>
                    )
            }
        </ListGroup.Item>
    ));

    const handleSubmit = (username: string) => {
        if (!hostUsernames.includes(username)) props.onAddHost(username);
    }

    return (
        <div>
            <h2>Manage Hosts</h2>
            <h3>Add Hosts</h3>
            <p>{props.addHostTextPrefix} Add additional hosts to the queue here.</p>
            {userLoggedOnWarning}
            {props.checkHostError ? <ErrorDisplay formErrors={[props.checkHostError]} /> : undefined}
            <SingleInputField
                id="add_host"
                fieldComponent={StatelessInputGroupForm}
                formLabel='Add Host'
                placeholder="Uniqname..."
                buttonOptions={{ onSubmit: handleSubmit, buttonType: 'success' }}
                disabled={props.disabled}
                fieldSchema={uniqnameSchema}
                showRemaining={false}
            >
                + Add Host
            </SingleInputField>
            <h3>Current Hosts</h3>
            <p>
                To remove a host, select the trash icon to the right of the user's name. <strong>You cannot remove yourself as a host.</strong>
            </p>
            <ListGroup>{hostsSoFar}</ListGroup>
        </div>
    );
}

type CombinedEditorProps = GeneralEditorProps & ManageHostsEditorProps;

export interface MultiTabEditorProps extends CombinedEditorProps {
    onTabSelect?: (eventKey: string | null, e: React.SyntheticEvent<unknown>) => void;
}

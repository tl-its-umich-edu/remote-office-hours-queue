import * as React from "react";
import { Alert, ListGroup } from "react-bootstrap";

import {
    ErrorDisplay, FormError, RemoveButton, SingleInputField, StatelessInputGroupForm, StatelessTextAreaForm,
    UserDisplay
} from "./common";
import { AllowedBackendsForm } from "./meetingType";
import { User } from "../models";
import { meetingConflictMessage, MeetingTypesValidationResult, uniqnameSchema, ValidationResult } from "../validation";


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
    backends: {[backend_type: string]: string};
    allowedMeetingTypes: Set<string>;
    allowedValidationResult?: MeetingTypesValidationResult;
    onChangeAllowed: (allowed: Set<string>) => void;
    showCorrectGeneralMessage: boolean;
}

export function GeneralEditor(props: GeneralEditorProps) {
    const correctMessage = 'Please correct the invalid entries below in order to proceed.';

    let allowedFeedbackMessages;
    let meetingConflictsAlert;
    if (props.allowedValidationResult && props.allowedValidationResult.isInvalid) {
        allowedFeedbackMessages = props.allowedValidationResult.messages.map((m, key) => <Alert key={key} variant='danger'>{m}</Alert>);
        if (props.allowedValidationResult.existingMeetingConflict) {
            meetingConflictsAlert = (
                <Alert variant='danger'>
                    <span>{meetingConflictMessage}</span>
                    <ul>{props.allowedValidationResult.meetingConflicts?.map((mc, key) => <li key={key}>{mc}</li>)}</ul>
                </Alert>
            );
        }
    }

    return (
        <div>
            <h2>General</h2>
            {props.showCorrectGeneralMessage ? <Alert variant='danger'>{correctMessage}</Alert> : undefined}
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
            <div>{allowedFeedbackMessages}</div>
            {meetingConflictsAlert}
            <AllowedBackendsForm
                allowed={props.allowedMeetingTypes}
                backends={props.backends}
                onChange={props.onChangeAllowed}
                disabled={props.disabled}
            />
        </div>
    );
}

interface ManageHostsEditorProps extends QueueEditorProps {
    currentUser?: User;
    hosts: User[];
    onAddHost: (username: string) => void;
    onRemoveHost: (user: User) => void;
    checkHostError?: FormError;
}

export function ManageHostsEditor(props: ManageHostsEditorProps) {
    const hostUsernames = props.hosts.map(h => h.username);

    const hostsSoFar = props.hosts.map((host, key) => (
        <ListGroup.Item key={key}>
            <UserDisplay user={host} />
            <div className='float-right'>
                <RemoveButton
                    onRemove={() => props.onRemoveHost(host)}
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
                        props.onAddHost(username)
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
        </div>
    );
}

type CombinedEditorProps = GeneralEditorProps & ManageHostsEditorProps;

export interface MultiTabEditorProps extends CombinedEditorProps {
    onTabSelect: (eventKey: string) => void;
}

import * as React from "react";
import { Alert, ListGroup, Form } from "react-bootstrap";

import {
    ErrorDisplay, FormError, RemoveButton, SingleInputField, StatelessInputGroupForm,
    UserDisplay, userLoggedOnWarning
} from "./common";
import { AllowedBackendsForm } from "./meetingType";
import { MeetingBackend, User } from "../models";
import { MeetingTypesValidationResult, uniqnameSchema, ValidationResult } from "../validation";

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
    inpersonLocation: string;
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
            <h3>Name</h3>
            <Form.Group controlId="formQueueName">
                <Form.Label>Queue Name</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Queue name..."
                    value={props.name}
                    onChange={(e) => props.onChangeName(e.target.value)}
                    isInvalid={props.nameValidationResult?.isInvalid}
                    disabled={props.disabled}
                    required
                />
                <Form.Control.Feedback type="invalid">
                    Please provide a valid queue name.
                </Form.Control.Feedback>
            </Form.Group>
            <h3>Description</h3>
            <Form.Group controlId='description'>
                <Form.Label>Queue Description</Form.Label>
                <Form.Control
                    as="textarea"
                    value={props.description}
                    placeholder='Queue description...'
                    disabled={props.disabled}
                    isInvalid={props.descriptValidationResult?.isInvalid}
                    onChange={(e) => props.onChangeDescription(e.target.value)}
                />
                <Form.Control.Feedback type="invalid">
                    {props.descriptValidationResult?.messages.join(', ')}
                </Form.Control.Feedback>
            </Form.Group>
            <h3>Meeting Types</h3>
            <p>Allow the following meeting types (select at least one):</p>
            <div>{allowedFeedbackMessages}</div>
            <AllowedBackendsForm
                allowed={props.allowedMeetingTypes}
                backends={props.backends}
                onChange={props.onChangeAllowed}
                disabled={props.disabled}
            />
            {props.allowedMeetingTypes.has('inperson') && 
                <>
                    <h3>In-Person Meeting Location</h3>
                    <p>
                        Attendees who select to meet in-person will be instructed to meet at this location. 
                        Enter all information an attendee would need to know, such as a street address, building name, and/or room number.
                    </p>
                    <Form.Group controlId='inpersonLocation'>
                        <Form.Label>In-Person Meeting Location</Form.Label>
                        <Form.Control
                            type="text"
                            value={props.inpersonLocation}
                            placeholder='In-person meeting location...'
                            disabled={props.disabled}
                            isInvalid={props.locationValidationResult?.isInvalid}
                            onChange={(e) => props.onChangeLocation(e.target.value)}
                        />
                        <Form.Control.Feedback type="invalid">
                            {props.locationValidationResult?.messages.join(', ')}
                        </Form.Control.Feedback>
                    </Form.Group>
                </>
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
        <ListGroup.Item className='p-3' key={key}>
            <UserDisplay user={host} />
            {
                (host.id !== props.currentUser?.id)
                    && (
                        <div className='float-end'>
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

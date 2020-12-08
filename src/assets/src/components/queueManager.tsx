import * as React from "react";
import { useState, createRef, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { Alert, Button, Col, Form, InputGroup, Modal, Row } from "react-bootstrap";
import Dialog from "react-bootstrap-dialog";

import {
    UserDisplay, ErrorDisplay, FormError, checkForbiddenError, LoadingDisplay, DateDisplay,
    CopyField, showConfirmation, LoginDialog, Breadcrumbs, DateTimeDisplay, BlueJeansDialInMessage,
    userLoggedOnWarning, DialInMessageProps, ZoomDialInMessage
} from "./common";
import { MeetingsInProgressTable, MeetingsInQueueTable } from "./meetingTables";
import { BackendSelector as MeetingBackendSelector, getBackendByName } from "./meetingType";
import { PageProps } from "./page";
import { usePromise } from "../hooks/usePromise";
import { useStringValidation } from "../hooks/useValidation";
import {
    BluejeansMetadata, isQueueHost, Meeting, MeetingBackend, MeetingStatus, MyUser, QueueAttendee, QueueHost,
    User, VideoBackendNames, ZoomMetadata
} from "../models";
import * as api from "../services/api";
import { useQueueWebSocket, useUserWebSocket } from "../services/sockets";
import { addMeetingAutoAssigned, checkBackendAuth, recordQueueManagementEvent, redirectToLogin } from "../utils";
import { confirmUserExists, uniqnameSchema } from "../validation";


interface AddAttendeeFormProps {
    allowedBackends: Set<string>;
    backends: MeetingBackend[];
    defaultBackend: string;
    disabled: boolean;
    onSubmit: (value: string, backend: string) => void;
}

function AddAttendeeForm(props: AddAttendeeFormProps) {
    const [attendee, setAttendee] = useState('');
    const [selectedBackend, setSelectedBackend] = useState(props.defaultBackend);
    const [attendeeValidationResult, validateAndSetAttendeeResult, clearAttendeeResult] = useStringValidation(uniqnameSchema);

    if (!props.allowedBackends.has(selectedBackend)) {
        setSelectedBackend(Array.from(props.allowedBackends)[0]);
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const curAttendeeValidationResult = !attendeeValidationResult ? validateAndSetAttendeeResult(attendee) : attendeeValidationResult;
        if (!curAttendeeValidationResult.isInvalid) {
            props.onSubmit(attendee, selectedBackend);
            clearAttendeeResult();
            setAttendee(''); // Clear successful input
        }
    }

    const handleAttendeeChange = (e: any) => {
        const newAttendee = e.currentTarget.value;
        setAttendee(newAttendee);
        validateAndSetAttendeeResult(newAttendee);
    }

    let feedback;
    if (attendeeValidationResult) {
        // Only show one message at a time.
        const feedbackTextClass = attendeeValidationResult.isInvalid ? ' text-danger' : '';
        feedback = <Form.Text className={`form-feedback${feedbackTextClass}`}>{attendeeValidationResult.messages[0]}</Form.Text>;
    }

    return (
        <Form onSubmit={handleSubmit} aria-label='Add Attendee'>
            <InputGroup>
                <Form.Control
                    id='add_attendee'
                    as='input'
                    value={attendee}
                    placeholder='Uniqname...'
                    onChange={handleAttendeeChange}
                    disabled={props.disabled}
                    isInvalid={attendeeValidationResult?.isInvalid}
                />
                <InputGroup.Append>
                    <MeetingBackendSelector
                        allowedBackends={props.allowedBackends}
                        backends={props.backends}
                        onChange={setSelectedBackend}
                        selectedBackend={selectedBackend}
                    />
                </InputGroup.Append>
                <InputGroup.Append>
                    <Button variant='success' type='submit' disabled={props.disabled}>
                        + Add Attendee
                    </Button>
                </InputGroup.Append>
            </InputGroup>
            {feedback}
        </Form>
    );
}

interface QueueManagerProps {
    queue: QueueHost;
    user: User;
    disabled: boolean;
    backends: MeetingBackend[];
    defaultBackend: string;
    onAddMeeting: (uniqname: string, backend: string) => void;
    onRemoveMeeting: (m: Meeting) => void;
    onSetStatus: (open: boolean) => void;
    onShowMeetingInfo: (m: Meeting) => void;
    onChangeAssignee: (a: User | undefined, m: Meeting) => void;
    onStartMeeting: (m: Meeting) => void;
}

function QueueManager(props: QueueManagerProps) {
    const spacingClass = 'mt-4';

    let startedMeetings = [];
    let unstartedMeetings = [];
    for (const meeting of props.queue.meeting_set) {
        if (meeting.status ===  MeetingStatus.STARTED) {
            startedMeetings.push(meeting);
        } else {
            unstartedMeetings.push(meeting);
        }
    }

    const currentStatus = props.queue.status === 'open';
    const absoluteUrl = `${location.origin}/queue/${props.queue.id}`;

    const cannotReassignHostWarning = (
        <Alert variant='primary'>
            Once you start a video conferencing meeting or indicate you are ready for an attendee in person,
            you cannot re-assign the meeting to another host.
        </Alert>
    );

    return (
        <div>
            <div className="float-right">
                <Link to={`/manage/${props.queue.id}/settings`}>
                    <Button variant='primary' aria-label='Settings'>
                        <FontAwesomeIcon icon={faCog} />
                        <span className='ml-2'>Settings</span>
                    </Button>
                </Link>
            </div>
            <h1>Manage: {props.queue.name}</h1>
            <p><Link to={"/queue/" + props.queue.id}>View as visitor</Link></p>
            <Row noGutters className={spacingClass}>
                <Col md={2}><Form.Label htmlFor='queue-url'>Queue URL</Form.Label></Col>
                <Col md={6}><CopyField text={absoluteUrl} id="queue-url"/></Col>
            </Row>
            <Row noGutters className={spacingClass}>
                <Col md={2}><Form.Label htmlFor='queue-status'>Queue Status</Form.Label></Col>
                <Col md={6}>
                    <Form.Check
                        className='switch'
                        id='queue-status'
                        type='switch'
                        label={currentStatus ? 'Open' : 'Closed'}
                        checked={props.queue.status === 'open'}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => props.onSetStatus(!currentStatus)}
                    />
                </Col>
            </Row>
            <Row noGutters className={spacingClass}>
                <Col md={2}><div id='created'>Created</div></Col>
                <Col md={6}><div aria-labelledby='created'><DateDisplay date={props.queue.created_at} /></div></Col>
            </Row>
            <h2 className={spacingClass}>Meetings in Progress</h2>
            <Row noGutters className={spacingClass}><Col md={8}>{cannotReassignHostWarning}</Col></Row>
            <Row noGutters className={spacingClass}>
                <Col md={12}><MeetingsInProgressTable meetings={startedMeetings} {...props} /></Col>
            </Row>
            <h2 className={spacingClass}>Meetings in Queue</h2>
            <Row noGutters className={spacingClass}>
                <Col md={8}>
                    {userLoggedOnWarning}
                    <AddAttendeeForm
                        allowedBackends={new Set(props.queue.allowed_backends)}
                        backends={props.backends}
                        defaultBackend={props.defaultBackend}
                        disabled={props.disabled}
                        onSubmit={props.onAddMeeting}
                    />
                </Col>
            </Row>
            <Row noGutters className={spacingClass}>
                <Col md={12}><MeetingsInQueueTable meetings={unstartedMeetings} {...props} /></Col>
            </Row>
        </div>
    );
}

interface HostVideoMeetingInfoProps {
    metadata: BluejeansMetadata | ZoomMetadata;
    backend: MeetingBackend;
}

const HostVideoMeetingInfo = (props: HostVideoMeetingInfoProps) => {
    let dialInMessage;
    if (props.metadata.numeric_meeting_id) {
        const dialInProps = {
            phone: props.backend.telephone_num,
            meetingNumber: props.metadata.numeric_meeting_id,
            intlNumbersURL: props.backend.intl_telephone_url
        } as DialInMessageProps;

        dialInMessage = props.backend.name === 'zoom'
            ? <ZoomDialInMessage {...dialInProps} />
            : props.backend.name === 'bluejeans'
                ? <BlueJeansDialInMessage {...dialInProps} />
                : null;
    }

    return (
        <>
        <p>This meeting will be via <strong>{props.backend.friendly_name}</strong>.</p>
        {dialInMessage}
        </>
    );
}

interface MeetingInfoDialogProps {
    backends: MeetingBackend[];
    meeting?: Meeting;  // Hide if undefined
    onClose: () => void;
}

const MeetingInfoDialog = (props: MeetingInfoDialogProps) => {
    const attendeeDetails = props.meeting?.attendees.map((a, key) => <p key={key}><UserDisplay user={a}/></p>);
    const generalInfo = props.meeting
        && (
            <>
            Attendees:
            <div>{attendeeDetails}</div>
            <p>
                Time Joined: <DateTimeDisplay dateTime={props.meeting.created_at}/>
            </p>
            <p>
                Agenda: {props.meeting.agenda}
            </p>
            </>
        );

    const meetingType = props.meeting?.backend_type
    const metadataInfo = meetingType
        && (
            VideoBackendNames.includes(meetingType)
                ? (
                    <HostVideoMeetingInfo
                        backend={getBackendByName(meetingType, props.backends)}
                        metadata={props.meeting!.backend_metadata!}
                    />
                ) : <div><p>This meeting will be <strong>In Person</strong>.</p></div>
        );

    return (
        <Modal show={!!props.meeting} onHide={props.onClose}>
            <Modal.Header closeButton>
                <Modal.Title data-id={props.meeting?.id}>Join Info</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {generalInfo}
                {metadataInfo}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={props.onClose}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
}

interface QueueManagerPageParams {
    queue_id: string;
}

export function QueueManagerPage(props: PageProps<QueueManagerPageParams>) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }
    const queue_id = props.match.params.queue_id;
    if (queue_id === undefined) throw new Error("queue_id is undefined!");
    if (!props.user) throw new Error("user is undefined!");
    const dialogRef = createRef<Dialog>();
    const queueIdParsed = parseInt(queue_id);

    // Set up basic state
    const [queue, setQueue] = useState(undefined as QueueHost | undefined);
    const [authError, setAuthError] = useState(undefined as Error | undefined);
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
    const queueWebSocketError = useQueueWebSocket(queueIdParsed, setQueueChecked);
    const [visibleMeetingDialog, setVisibleMeetingDialog] = useState(undefined as Meeting | undefined);

    const [myUser, setMyUser] = useState(undefined as MyUser | undefined);
    const userWebSocketError = useUserWebSocket(props.user!.id, (u) => setMyUser(u as MyUser));

    if (myUser && queue) {
        checkBackendAuth(myUser, queue);
    }

    // Set up API interactions
    const removeMeeting = async (m: Meeting) => {
        recordQueueManagementEvent("Removed Meeting");
        await api.removeMeeting(m.id);
    }
    const [doRemoveMeeting, removeMeetingLoading, removeMeetingError] = usePromise(removeMeeting);
    const confirmRemoveMeeting = (m: Meeting) => {
        showConfirmation(
            dialogRef,
            () => doRemoveMeeting(m),
            "Remove Meeting?",
            `Are you sure you want to remove your meeting with ${m.attendees[0].first_name} ${m.attendees[0].last_name}?`
        );
    }
    const addMeeting = async (uniqname: string, backend: string) => {
        const user = await confirmUserExists(uniqname);
        recordQueueManagementEvent("Added Meeting");
        await addMeetingAutoAssigned(queue!, props.user!.id, backend);
    }
    const [doAddMeeting, addMeetingLoading, addMeetingError] = usePromise(addMeeting);

    const setStatus = async (open: boolean) => {
        recordQueueManagementEvent("Set Open/Close: " + open);
        return await api.setStatus(queue!.id, open);
    }
    const [doSetStatus, setStatusLoading, setStatusError] = usePromise(setStatus, setQueueChecked);
    
    const changeAssignee = async (assignee: User | undefined, meeting: Meeting) => {
        recordQueueManagementEvent("Changed Assignee");
        await api.changeMeetingAssignee(meeting.id, assignee?.id);
    }
    const [doChangeAssignee, changeAssigneeLoading, changeAssigneeError] = usePromise(changeAssignee);
    
    const startMeeting = async (meeting: Meeting) => {
        recordQueueManagementEvent("Started Meeting");
        await api.startMeeting(meeting.id);
    }
    const [doStartMeeting, startMeetingLoading, startMeetingError] = usePromise(startMeeting);

    // Render
    const isChanging = removeMeetingLoading || addMeetingLoading || setStatusLoading || changeAssigneeLoading || startMeetingLoading;
    const errorSources = [
        {source: 'Access Denied', error: authError},
        {source: 'Queue Connection', error: queueWebSocketError},
        {source: 'User Connection', error: userWebSocketError},
        {source: 'Remove Meeting', error: removeMeetingError},
        {source: 'Add Meeting', error: addMeetingError},
        {source: 'Queue Status', error: setStatusError},
        {source: 'Assignee', error: changeAssigneeError},
        {source: 'Start Meeting', error: startMeetingError},
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = errorSources.some(checkForbiddenError);
    const loadingDisplay = <LoadingDisplay loading={isChanging}/>;
    const errorDisplay = <ErrorDisplay formErrors={errorSources}/>;
    const queueManager = queue
        && (
            <QueueManager
                queue={queue}
                disabled={isChanging}
                user={props.user!}
                backends={props.backends}
                defaultBackend={props.defaultBackend}
                onAddMeeting={doAddMeeting}
                onRemoveMeeting={confirmRemoveMeeting}
                onSetStatus={doSetStatus}
                onShowMeetingInfo={setVisibleMeetingDialog}
                onChangeAssignee={doChangeAssignee}
                onStartMeeting={doStartMeeting}
            />
        );
    return (
        <>
            <Dialog ref={dialogRef}/>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <MeetingInfoDialog backends={props.backends} meeting={visibleMeetingDialog} onClose={() => setVisibleMeetingDialog(undefined)} />
            <Breadcrumbs currentPageTitle={queue?.name ?? queueIdParsed.toString()} intermediatePages={[{title: "Manage", href: "/manage"}]} />
            {loadingDisplay}
            {errorDisplay}
            {queueManager}
        </>
    );
}

import * as React from "react";
import { useState, createRef, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { Alert, Button, Col, Form, InputGroup, Modal, Row, Table } from "react-bootstrap";
import Dialog from "react-bootstrap-dialog";

import { 
    UserDisplay, RemoveButton, ErrorDisplay, FormError, checkForbiddenError, LoadingDisplay, DateDisplay,
    CopyField, showConfirmation, LoginDialog, Breadcrumbs, DateTimeDisplay, BlueJeansDialInMessage,
    userLoggedOnWarning
} from "./common";
import { BackendSelector as MeetingBackendSelector } from "./meetingType";
import { PageProps } from "./page";
import { usePromise } from "../hooks/usePromise";
import { User, QueueHost, Meeting, BluejeansMetadata, isQueueHost, QueueAttendee } from "../models";
import * as api from "../services/api";
import { useQueueWebSocket } from "../services/sockets";
import { recordQueueManagementEvent, redirectToLogin } from "../utils";
import { confirmUserExists, uniqnameSchema, validateAndSetStringResult, ValidationResult } from "../validation";


interface MeetingEditorProps {
    meeting: Meeting;
    disabled: boolean;
    potentialAssignees: User[];
    user: User;
    backends: {[backend_type: string]: string};
    onRemove: (m: Meeting) => void;
    onShowMeetingInfo: (m: Meeting) => void;
    onChangeAssignee: (a: User | undefined) => void;
}

function MeetingEditor(props: MeetingEditorProps) {
    const user = props.meeting.attendees[0];
    const joinUrl = props.meeting.backend_metadata?.meeting_url;
    const joinLink = joinUrl
        ? (
            <a href={joinUrl} target="_blank" className="btn btn-primary btn-sm mr-2" aria-label={`Start Meeting with ${user.first_name} ${user.last_name}`}>
                Start Meeting
            </a>
        )
        : (
            <span className="badge badge-secondary mr-2">{props.backends[props.meeting.backend_type]}</span>
        );
    const infoButton = (
        <Button onClick={() => props.onShowMeetingInfo(props.meeting)} variant="link" size="sm" className="mr-2">
            Join Info
        </Button>
    );
    const assigneeOptions = [<option key={0} value="">Assign to Host...</option>]
        .concat(
            props.potentialAssignees
                .sort((a, b) => a.id === props.user.id ? -1 : b.id === props.user.id ? 1 : 0)
                .map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name} ({a.username})</option>)
        );
    const onChangeAssignee = (e: React.ChangeEvent<HTMLSelectElement>) =>
        e.target.value === ""
            ? props.onChangeAssignee(undefined)
            : props.onChangeAssignee(props.potentialAssignees.find(a => a.id === +e.target.value));
    return (
        <>
            <td><UserDisplay user={user}/></td>
            <td className="form-group">
                <select className="form-control assign"
                    value={props.meeting.assignee?.id ?? ""}
                    onChange={onChangeAssignee}
                >
                    {assigneeOptions}
                </select>
            </td>
            <td>
                <Row>
                    <Col md={5}>{joinLink}</Col>
                    <Col md={4}>{infoButton}</Col>
                    <Col md={3}>
                        <RemoveButton
                            onRemove={() => props.onRemove(props.meeting)}
                            size="sm" disabled={props.disabled}
                            screenReaderLabel={`Remove Meeting with ${user.first_name} ${user.last_name}`}
                        />
                    </Col>
                </Row>
            </td>
        </>
    );
}

interface AddAttendeeFormProps {
    allowedBackends: Set<string>;
    backends: {[backend_type: string]: string};
    defaultBackend: string;
    disabled: boolean;
    onSubmit: (value: string, backend: string) => void;
}

function AddAttendeeForm(props: AddAttendeeFormProps) {
    const [attendee, setAttendee] = useState('');
    const [selectedBackend, setSelectedBackend] = useState(props.defaultBackend);
    const [attendeeValidationResult, setAttendeeValidationResult] = useState(undefined as ValidationResult | undefined);

    if (!props.allowedBackends.has(selectedBackend)) {
        setSelectedBackend(Array.from(props.allowedBackends)[0]);
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const curAttendeeValidationResult = !attendeeValidationResult
            ? validateAndSetStringResult(attendee, uniqnameSchema, setAttendeeValidationResult)
            : attendeeValidationResult;
        if (!curAttendeeValidationResult.isInvalid) {
            props.onSubmit(attendee, selectedBackend);
            setAttendeeValidationResult(undefined);
            setAttendee(''); // Clear successful input
        }
    }

    const handleAttendeeChange = (e: any) => {
        const attendee = e.currentTarget.value;
        setAttendee(attendee);
        validateAndSetStringResult(attendee, uniqnameSchema, setAttendeeValidationResult);
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
                    className='form-control-remaining'
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
    backends: {[backend_type: string]: string};
    defaultBackend: string;
    onAddMeeting: (uniqname: string, backend: string) => void;
    onRemoveMeeting: (m: Meeting) => void;
    onSetStatus: (open: boolean) => void;
    onShowMeetingInfo: (m: Meeting) => void;
    onChangeAssignee: (a: User | undefined, m: Meeting) => void;
}

function QueueManager(props: QueueManagerProps) {
    const spacingClass = 'mt-4';

    const meetings = props.queue.meeting_set
        .sort((a, b) => a.id - b.id)
        .map((m, i) =>
            <tr key={m.id}>
                <th scope="row" className="d-none d-sm-table-cell">{i+1}</th>
                <MeetingEditor
                    key={m.id}
                    user={props.user}
                    potentialAssignees={props.queue.hosts}
                    meeting={m}
                    disabled={props.disabled}
                    backends={props.backends}
                    onRemove={props.onRemoveMeeting}
                    onShowMeetingInfo={props.onShowMeetingInfo}
                    onChangeAssignee={(a: User | undefined) => props.onChangeAssignee(a, m)}
                />
            </tr>
        );
    const meetingsTable = props.queue.meeting_set.length
        ? (
            <Table bordered>
                <thead>
                    <tr>
                        <th scope="col" className="d-none d-sm-table-cell">Queue #</th>
                        <th scope="col">Attendee</th>
                        <th scope="col">Host</th>
                        <th scope="col">Meeting Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {meetings}
                </tbody>
            </Table>
        )
        : (
            <>
            <hr/>
            <h5>No Meetings in Queue</h5>
            <p>
                Did you know? You can get notified by SMS (text) message when someone joins your empty queue by adding your cell phone number and enabling host notifications in your <Link to="/preferences">User Preferences</Link>. 
            </p>
            </>
        );

    const currentStatus = props.queue.status === 'open';
    const absoluteUrl = `${location.origin}/queue/${props.queue.id}`;

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
                <Col md={2}><div id='created-at'>Created At</div></Col>
                <Col md={6}><div aria-labelledby='created-at'><DateDisplay date={props.queue.created_at}/></div></Col>
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
                <Col md={12}><div className="table-responsive">{meetingsTable}</div></Col>
            </Row>
        </div>
    );
}

interface BlueJeansMeetingInfo {
    metadata: BluejeansMetadata;
}

const BlueJeansMeetingInfo = (props: BlueJeansMeetingInfo) => {
    const meetingNumber = props.metadata.numeric_meeting_id;
    return (
        <>
        <p>
            This meeting will be via <strong>BlueJeans</strong>.
        </p>
        <p>
            <BlueJeansDialInMessage meetingNumber={meetingNumber} />
        </p>
        </>
    );
}

interface MeetingInfoProps {
    meeting?: Meeting;  // Hide if undefined
    onClose: () => void;
}

const MeetingInfoDialog = (props: MeetingInfoProps) => {
    const attendeeDetails = props.meeting?.attendees.map(a => 
        <p>
            <UserDisplay user={a}/>
        </p>
    );
    const generalInfo = props.meeting
        && (
            <>
            Attendees:
            <p>
                {attendeeDetails}
            </p>
            <p>
                Time Joined: <DateTimeDisplay dateTime={props.meeting.created_at}/>
            </p>
            <p>
                Agenda: {props.meeting.agenda}
            </p>
            </>
        );
    const metadataInfo = props.meeting?.backend_type === "bluejeans"
        ? <BlueJeansMeetingInfo metadata={props.meeting!.backend_metadata!} />
        : <div><p>This meeting will be <strong>in person</strong>.</p></div>
    return (
        <Modal show={!!props.meeting} onHide={props.onClose}>
            <Modal.Header closeButton>
                <Modal.Title>Join Info</Modal.Title>
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

    // Set up API interactions
    const removeMeeting = async (m: Meeting) => {
        recordQueueManagementEvent("Removed Meeting");
        await api.removeMeeting(m.id);
    }
    const [doRemoveMeeting, removeMeetingLoading, removeMeetingError] = usePromise(removeMeeting);
    const confirmRemoveMeeting = (m: Meeting) => {
        showConfirmation(dialogRef, () => doRemoveMeeting(m), "Remove Meeting?", `remove your meeting with ${m.attendees[0].first_name} ${m.attendees[0].last_name}`);
    }
    const addMeeting = async (uniqname: string, backend: string) => {
        const user = await confirmUserExists(uniqname);
        recordQueueManagementEvent("Added Meeting");
        await api.addMeeting(queue!.id, user.id, backend);
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
    
    // Render
    const isChanging = removeMeetingLoading || addMeetingLoading || setStatusLoading || changeAssigneeLoading;
    const errorSources = [
        {source: 'Access Denied', error: authError},
        {source: 'Queue Connection', error: queueWebSocketError},
        {source: 'Remove Meeting', error: removeMeetingError},
        {source: 'Add Meeting', error: addMeetingError},
        {source: 'Queue Status', error: setStatusError},
        {source: 'Assignee', error: changeAssigneeError}
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
            />
        );
    return (
        <>
            <Dialog ref={dialogRef}/>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <MeetingInfoDialog meeting={visibleMeetingDialog} onClose={() => setVisibleMeetingDialog(undefined)} />
            <Breadcrumbs currentPageTitle={queue?.name ?? queueIdParsed.toString()} intermediatePages={[{title: "Manage", href: "/manage"}]} />
            {loadingDisplay}
            {errorDisplay}
            {queueManager}
        </>
    );
}

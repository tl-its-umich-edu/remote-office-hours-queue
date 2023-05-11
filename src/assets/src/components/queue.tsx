import * as React from "react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as ReactGA from "react-ga";
import { Alert, Button, Card, Col, Modal, Row } from "react-bootstrap";

import {
    BluejeansMetadata, EnabledBackendName, Meeting, MeetingBackend, MeetingStatus, MyUser,
    QueueAttendee, User, VideoBackendNames, ZoomMetadata
} from "../models";
import {
    checkForbiddenError, Breadcrumbs, DateTimeDisplay, Dialog, DisabledMessage, EditToggleField, ErrorDisplay,
    FormError, JoinedQueueAlert, LoadingDisplay, LoginDialog, StatelessInputGroupForm
} from "./common";
import { DialInContent } from "./dialIn";
import { BackendSelector, getBackendByName } from "./meetingType";
import { PageProps } from "./page";
import { useDialogState } from "../hooks/useDialogState";
import { usePromise } from "../hooks/usePromise";
import * as api from "../services/api";
import { useQueueWebSocket, useUserWebSocket } from "../services/sockets";
import { addMeetingAutoAssigned, redirectToLogin } from "../utils";
import { meetingAgendaSchema } from "../validation";


interface JoinQueueProps {
    queue: QueueAttendee;
    backends: MeetingBackend[];
    onJoinQueue: (backend: string) => void;
    disabled: boolean;
    selectedBackend: string;
    onChangeSelectedBackend: (backend: string) => void;
}

const JoinQueue: React.FC<JoinQueueProps> = (props) => {
    return (
        <>
        <Row>
            <Col lg>
                <p className="mb-0">Select Meeting Type<span className="required">*</span></p>
            </Col>
        </Row>
        <Row>
            <Col xs='auto'>
                <BackendSelector
                    backends={props.backends}
                    allowedBackends={new Set(props.queue.allowed_backends)}
                    onChange={props.onChangeSelectedBackend}
                    selectedBackend={props.selectedBackend}
                />
            </Col>
        </Row>
        <Row>
            <Col lg>
                <Button
                    variant="primary"
                    className="bottom-content"
                    type="button"
                    disabled={props.disabled}
                    onClick={() => props.onJoinQueue(props.selectedBackend)}
                >
                    Join Queue
                </Button>
            </Col>
        </Row>
        </>
    );
}

interface QueueAttendingProps {
    queue: QueueAttendee;
    backends: MeetingBackend[];
    user: User;
    joinedQueue?: QueueAttendee | null;
    disabled: boolean;
    onJoinQueue: (backend: string) => void;
    onLeaveQueue: (myMeeting: Meeting) => void;
    onLeaveAndJoinQueue: (backend: string) => void;
    onChangeAgenda: (agenda: string) => void;
    onShowDialog: () => void;
    onChangeBackendType: (oldBackendType: string, backend: string) => void;
    selectedBackend: string;
    onChangeBackend: (backend: string) => void;
}

function QueueAttendingNotJoined(props: QueueAttendingProps) {
    const joinedOther = props.joinedQueue && props.joinedQueue.id !== props.queue.id;
    
    const notJoinedInpersonMeetingText = (
        props.queue.inperson_location === ''
            ? (
                'The host(s) have not specified an in-person meeting location.'
            )
            : <>In-person meetings will take place at: <strong>{props.queue.inperson_location}</strong></>
    );

    const controls = props.queue.status !== "closed" && (
        joinedOther && props.joinedQueue
            ? (
                <>
                <Row>
                    <Col lg>
                        <JoinedQueueAlert joinedQueue={props.joinedQueue}/>
                    </Col>
                </Row>
                <JoinQueue queue={props.queue} backends={props.backends} onJoinQueue={props.onLeaveAndJoinQueue} disabled={props.disabled}
                    selectedBackend={props.selectedBackend} onChangeSelectedBackend={props.onChangeBackend}/>
                </>
            )
            : (
                <JoinQueue queue={props.queue} backends={props.backends} onJoinQueue={props.onJoinQueue} disabled={props.disabled}
                    selectedBackend={props.selectedBackend} onChangeSelectedBackend={props.onChangeBackend}/>
            )
    );
    const closedAlert = props.queue.status === "closed"
        && <Alert variant="dark"><strong>This queue is currently closed.</strong> Please return at a later time or message the queue host to find out when the queue will be open.</Alert>
    return (
        <>
        {closedAlert}
        <Row>
            <Col>
                <ul>
                    <li>Number of people currently in line: <strong>{props.queue.line_length}</strong></li>
                    <li>You are not in the meeting queue yet</li>
                    {props.queue.allowed_backends.includes('inperson') && <li>{notJoinedInpersonMeetingText}</li>}
                </ul>
            </Col>
        </Row>
        {controls}
        </>
    );
}


interface TurnAlertProps {
    meetingType: EnabledBackendName;
}

const MeetingReadyAlert = (props: TurnAlertProps) => {
    const typeEnding = props.meetingType === 'inperson'
        ? 'go to the in-person meeting location to meet with the host'
        : 'follow the directions to join the meeting now';

    return <Alert variant="success">The host is ready for you! If you haven't already, {typeEnding}.</Alert>;
}

interface WaitingTurnAlertProps extends TurnAlertProps {
    placeInLine: number;
}

const WaitingTurnAlert = (props: WaitingTurnAlertProps) => {
    const inPersonEnding = '-- we will tell you when the host is ready. Make sure you are nearby the in-person meeting location.';
    const videoMessageEnding = 'so you can join the meeting once it is created.';

    const typeEnding = props.meetingType === 'inperson' ? inPersonEnding : videoMessageEnding;

    const placeBeginning = props.placeInLine > 0
        ? "It's not your turn yet, but the host may be ready for you at any time."
        : "You're up next, but the host isn't quite ready for you.";
    return (
        <Alert variant="warning">
            {placeBeginning} Pay attention to this page {typeEnding}
        </Alert>
    );
}

interface JoinedClosedAlertProps { meetingStatus: MeetingStatus }

const JoinedClosedAlert = (props: JoinedClosedAlertProps) => {
    const statusClause = props.meetingStatus === MeetingStatus.STARTED ? 'your meeting is still in progress' : 'you are still in line';
    return (
        <Alert variant="dark">
            This queue has been closed by the host, but {statusClause}.
            If you are unsure if your meeting will still happen, please contact the host.
        </Alert>
    );
}

interface VideoMeetingInfoProps {
    metadata: BluejeansMetadata | ZoomMetadata;
    backend: MeetingBackend;
}

const VideoMeetingInfo: React.FC<VideoMeetingInfoProps> = (props) => {
    const docLinkTag = (
        <a
            href={props.backend.docs_url === null ? undefined : props.backend.docs_url}
            target='_blank'
            className='card-link'
        >
            Getting Started with {props.backend.friendly_name} at U-M
        </a>
    );

    return (
        <>
        <Row>
            <Col md={6} sm={true}>
                <Card>
                    <Card.Body>
                        <Card.Title as='h5' className='mt-0'>Joining the Meeting</Card.Title>
                        <Card.Text>
                            Once the meeting is created, click Join Meeting to join the meeting and wait for the host.
                            Download the app and test your audio now.
                            Refer to {docLinkTag} for additional help getting started.
                        </Card.Text>
                    </Card.Body>
                </Card>
            </Col>
            <Col md={6} sm={true}>
                <Card>
                    <Card.Body>
                        <Card.Title className='mt-0'>Having Trouble with Video?</Card.Title>
                        <Card.Text><DialInContent {...props} /></Card.Text>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
        </>
    );
}


function QueueAttendingJoined(props: QueueAttendingProps) {
    const meeting = props.queue.my_meeting!;
    const meetingBackend = getBackendByName(meeting.backend_type, props.backends);
    const isVideoMeeting = VideoBackendNames.includes(meetingBackend.name);
    const inProgress = meeting.status === MeetingStatus.STARTED;

    // Alerts and head
    const closedAlert = props.queue.status === 'closed' && <JoinedClosedAlert meetingStatus={meeting.status} />;

    const turnAlert = meeting.line_place !== null
        ? <WaitingTurnAlert meetingType={meetingBackend.name} placeInLine={meeting.line_place} />
        : <MeetingReadyAlert meetingType={meetingBackend.name} />;

    const headText = inProgress ? 'Your meeting is in progress.' : 'You are currently in line.';

    // Card content
    const changeMeetingType = props.queue.my_meeting?.assignee
        ? <small className="ms-2">(A Host has been assigned to this meeting. Meeting Type can no longer be changed.)</small>
        : <Button variant='link' onClick={props.onShowDialog} aria-label='Change Meeting Type' disabled={props.disabled}>Change</Button>;

    const notificationBlurb = !inProgress
        && (
            <Alert variant="info">
                <small>
                    Did you know? You can receive an SMS (text) message when
                    it's your turn by adding your cell phone number and
                    enabling attendee notifications in
                    your <Link to="/preferences">User Preferences</Link>.
                </small>
            </Alert>
        );

    const agendaBlock = !inProgress
        ? (
            <>
            <Card.Text><strong>Meeting Agenda</strong> (Optional):</Card.Text>
            <Card.Text><small>Let the host(s) know the topic you wish to discuss.</small></Card.Text>
            <EditToggleField
                id='agenda'
                value={meeting.agenda}
                formLabel='Meeting Agenda'
                placeholder=''
                buttonOptions={{ onSubmit: props.onChangeAgenda, buttonType: 'success' }}
                disabled={props.disabled}
                fieldComponent={StatelessInputGroupForm}
                fieldSchema={meetingAgendaSchema}
                showRemaining={true}
                initialState={!meeting.agenda}
            >
                Update
            </EditToggleField>
            </>
        )
        : <Card.Text><strong>Meeting Agenda</strong>: {meeting.agenda ? meeting.agenda : 'None'}</Card.Text>;

    // Meeting actions and info
    const leaveButtonText = inProgress ? 'Cancel My Meeting' : 'Leave the Line';
    const leave = (
        <Button
            variant='link'
            type='button'
            onClick={() => props.onLeaveQueue(meeting)}
            disabled={props.disabled}
            aria-label={leaveButtonText}
        >
            {leaveButtonText}
            {props.disabled && DisabledMessage}
        </Button>
    );

    const joinText = isVideoMeeting && (
        !inProgress
            ? (
                'The host has not created the meeting yet. You will be able to join the meeting once it is created. ' +
                "We'll show a message in this window when it is created -- pay attention to the window so you don't miss it."
            )
            : 'The host has created the meeting. Join it now! The host will join when they are ready for you.'
    );

    const joinedInpersonMeetingText = (
        props.queue.inperson_location === '' 
            ? (
                'The host(s) have not specified an in-person meeting location.'
            )
            : props.queue.inperson_location
    );

    const joinLink = isVideoMeeting && (
        meeting.backend_metadata!.meeting_url
            ? (
                <Button
                    href={meeting.backend_metadata!.meeting_url}
                    target='_blank'
                    variant='warning'
                    className='me-3'
                    aria-label='Join Meeting'
                    disabled={props.disabled}
                >
                    Join Meeting
                </Button>
            )
            : <span><strong>Please wait. A Join Meeting button will appear here.</strong></span>
    );

    const meetingInfo = isVideoMeeting && <VideoMeetingInfo metadata={meeting.backend_metadata!} backend={meetingBackend} />;

    return (
        <>
        {closedAlert}
        {turnAlert}
        <h3>{headText}</h3>
        <Card className='card-middle card-width center-align'>
            <Card.Body>
                {meeting.line_place !== null && <Card.Text><strong>Your Number in Line</strong>: {meeting.line_place + 1}</Card.Text>}
                {notificationBlurb}
                <Card.Text><strong>Time Joined</strong>: <DateTimeDisplay dateTime={props.queue.my_meeting!.created_at}/></Card.Text>
                <Card.Text>
                    <strong>Meeting Via</strong>: {meetingBackend.friendly_name} {!inProgress && changeMeetingType}
                </Card.Text>
                {
                    meetingBackend.name === 'inperson' &&
                    <Card.Text>
                        <strong>Meet At</strong>: {joinedInpersonMeetingText}
                    </Card.Text>
                }
                {agendaBlock}
            </Card.Body>
        </Card>
        {joinText && <p>{joinText}</p>}
        <Row className='mb-3'>
            <Col>
                {joinLink}
                {leave}
            </Col>
        </Row>
        {meetingInfo}
        </>
    );
}

function QueueAttending(props: QueueAttendingProps) {
    const description = props.queue.description.trim()
        && <p className="lead">{props.queue.description.trim()}</p>
    const content = !props.queue.my_meeting
        ? <QueueAttendingNotJoined {...props}/>
        : <QueueAttendingJoined {...props}/>
    const yourQueueAlert = props.queue.hosts.find(h => h.username === props.user.username)
        && (
            <>
            <br/>
            <p className="alert alert-info col-lg">
                This is your queue, you can <Link to={"/manage/" + props.queue.id}>manage it</Link>.
            </p>
            </>
        );
    const footer = (
        <a target="_blank" href="https://documentation.its.umich.edu/node/1833">
            Learn more about using Remote Office Hours Queue as an attendee
        </a>
    );
    return (
        <>
        <h2>Welcome to the {props.queue.name} meeting queue.</h2>
        {description}
        {content}
        {yourQueueAlert}
        <hr/>
        {footer}
        </>
    );
}

interface ChangeMeetingTypeDialogProps {
    queue: QueueAttendee;
    backends: MeetingBackend[];
    selectedBackend: string;
    show: boolean;
    onClose: () => void;
    onSubmit: (oldBackend: string) => void;
    onChangeBackend: (backend: string) => void;
}

const ChangeMeetingTypeDialog = (props: ChangeMeetingTypeDialogProps) => {
    const handleSubmit = () => {
        props.onClose();
        props.onSubmit(props.queue.my_meeting?.backend_type as string);
    }
    return (
        <Modal show={props.show} onHide={props.onClose}>
            <Modal.Header closeButton>
                <Modal.Title>Change Meeting Type</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row col-lg">
                    <p>Select Meeting Type</p>
                    <p className="required">*</p>
                </div>
                <BackendSelector backends={props.backends}
                    allowedBackends={new Set(props.queue.allowed_backends)}
                    onChange={props.onChangeBackend}
                    selectedBackend={props.selectedBackend}/>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={props.onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleSubmit}>OK</Button>
            </Modal.Footer>
        </Modal>
    );
}

export function QueuePage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }

    const { queue_id } = useParams();
    if (queue_id === undefined) throw new Error("queue_id is undefined!");
    if (!props.user) throw new Error("user is undefined!");
    const queueIdParsed = parseInt(queue_id);

    //Setup basic state
    const [selectedBackend, setSelectedBackend] = useState(undefined as string | undefined);
    const [queue, setQueue] = useState(undefined as QueueAttendee | undefined);
    const setQueueWrapped = (q: QueueAttendee | undefined) => {
        if (q) {
            setSelectedBackend(
                q.my_meeting
                    ? q.my_meeting.backend_type
                    : new Set(q.allowed_backends).has(props.defaultBackend)
                        ? props.defaultBackend
                        : Array.from(q.allowed_backends)[0]
            );
        }
        setQueue(q);
    }
    const queueWebSocketError = useQueueWebSocket(queueIdParsed, setQueueWrapped);
    const [myUser, setMyUser] = useState(undefined as MyUser | undefined);
    const userWebSocketError = useUserWebSocket(props.user!.id, (u) => setMyUser(u as MyUser));
    const [showMeetingTypeDialog, setShowMeetingTypeDialog] = useState(false);
    const [dialogState, setStateAndOpenDialog] = useDialogState();

    //Setup interactions
    const joinQueue = async (backendType: string) => {
        ReactGA.event({
            category: "Attending",
            action: "Joined Queue",
        });
        await addMeetingAutoAssigned(queue!, props.user!.id, backendType);
    }
    const [doJoinQueue, joinQueueLoading, joinQueueError] = usePromise(joinQueue);
    const leaveQueue = async () => {
        setSelectedBackend(
            new Set(queue!.allowed_backends).has(props.defaultBackend)
                ? props.defaultBackend
                : Array.from(queue!.allowed_backends)[0]
        );
        ReactGA.event({
            category: "Attending",
            action: "Left Queue",
        });
        await api.removeMeeting(queue!.my_meeting!.id);
    }
    const [doLeaveQueue, leaveQueueLoading, leaveQueueError] = usePromise(leaveQueue);
    const confirmLeaveQueue = (queueStatus: 'open' | 'closed', meetingStatus: MeetingStatus) => {
        const dialogParts = (meetingStatus === MeetingStatus.STARTED)
            ? {
                title: 'Cancel Meeting?',
                action: 'cancel the meeting',
                gerund: 'cancelling the meeting',
                consequences: 'you will no longer meet with the queue host(s)'
            } : {
                title: 'Leave Queue?',
                action: 'leave the queue',
                gerund: 'leaving the queue',
                consequences: 'you will lose your place in line'
            };

        const description = (
            `Are you sure you want to ${dialogParts.action}? ` +
            `By ${dialogParts.gerund}, ${dialogParts.consequences}. ` +
            'If you change your mind, you will have to re-join at the end of the line.' +
            (
                queueStatus === 'closed'
                    ? ' Note: The queue is currently closed. You will not be able to re-join until the queue is re-opened.'
                    : ''
            )
        );
        setStateAndOpenDialog(dialogParts.title, description, () => doLeaveQueue());
    }
    const leaveAndJoinQueue = async (backendType: string) => {
        ReactGA.event({
            category: "Attending",
            action: "Left Previous Queue and Joined New Queue",
        });
        await api.removeMeeting(myUser!.my_queue!.my_meeting!.id);
        await addMeetingAutoAssigned(queue!, props.user!.id, backendType);
    }
    const [doLeaveAndJoinQueue, leaveAndJoinQueueLoading, leaveAndJoinQueueError] = usePromise(leaveAndJoinQueue);
    const changeAgenda = async (agenda: string) => {
        return await api.changeAgenda(queue!.my_meeting!.id, agenda);
    }
    const [doChangeAgenda, changeAgendaLoading, changeAgendaError] = usePromise(changeAgenda);
    const changeBackendType = async () => {
        const meeting = await api.changeMeetingType(queue!.my_meeting!.id, selectedBackend!);
        setSelectedBackend(meeting.backend_type);
        return meeting;
    }
    const [doChangeBackendType, changeBackendTypeLoading, changeBackendTypeError] = usePromise(changeBackendType);
    
    //Render
    const isChanging = joinQueueLoading || leaveQueueLoading || leaveAndJoinQueueLoading || changeAgendaLoading || changeBackendTypeLoading;
    const errorSources = [
        {source: 'Queue Connection', error: queueWebSocketError}, 
        {source: 'Join Queue', error: joinQueueError}, 
        {source: 'Leave Queue', error: leaveQueueError}, 
        {source: 'User Connection', error: userWebSocketError}, 
        {source: 'Leave and Join Queue', error: leaveAndJoinQueueError}, 
        {source: 'Change Agenda', error: changeAgendaError},
        {source: 'Change Meeting Type', error: changeBackendTypeError}
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = errorSources.some(checkForbiddenError);
    const loadingDisplay = <LoadingDisplay loading={isChanging}/>
    const errorDisplay = <ErrorDisplay formErrors={errorSources}/>
    const queueDisplay = queue && selectedBackend
        && (
            <QueueAttending
                queue={queue}
                backends={props.backends}
                user={props.user}
                joinedQueue={myUser?.my_queue}
                disabled={isChanging}
                onJoinQueue={doJoinQueue}
                onLeaveQueue={(myMeeting: Meeting) => confirmLeaveQueue(queue.status, myMeeting.status)}
                onLeaveAndJoinQueue={doLeaveAndJoinQueue}
                onChangeAgenda={doChangeAgenda}
                onShowDialog={() => setShowMeetingTypeDialog(true)}
                onChangeBackendType={doChangeBackendType}
                selectedBackend={selectedBackend}
                onChangeBackend={setSelectedBackend}
            />
        );
    const meetingTypeDialog = queue && selectedBackend
        && <ChangeMeetingTypeDialog queue={queue} backends={props.backends} show={showMeetingTypeDialog} 
            onClose={() => setShowMeetingTypeDialog(false)} 
            onSubmit={doChangeBackendType} selectedBackend={selectedBackend} 
            onChangeBackend={setSelectedBackend}/>
    return (
        <div>
            <Dialog {...dialogState} />
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl}/>
            {meetingTypeDialog}
            <Breadcrumbs currentPageTitle={queue?.name ?? queueIdParsed.toString()}/>
            {loadingDisplay}
            {errorDisplay}
            {queueDisplay}
        </div>
    );
}

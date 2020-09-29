import * as React from "react";
import { useState, useEffect, createRef } from "react";
import { Link } from "react-router-dom";
import * as ReactGA from "react-ga";
import { Alert, Button, Card, Modal } from "react-bootstrap";
import Dialog from "react-bootstrap-dialog";

import { User, QueueAttendee, BluejeansMetadata, MyUser, Meeting } from "../models";
import {
    checkForbiddenError, BackendSelector, BlueJeansDialInMessage, Breadcrumbs, DateTimeDisplay,
    DisabledMessage, EditToggleField, StatelessInputGroupForm, ErrorDisplay, FormError, JoinedQueueAlert,
    LoadingDisplay, LoginDialog
} from "./common";
import { PageProps } from "./page";
import { usePromise } from "../hooks/usePromise";
import { meetingAgendaSchema } from "../validation";
import * as api from "../services/api";
import { useQueueWebSocket, useUserWebSocket } from "../services/sockets";
import { redirectToLogin } from "../utils";


interface JoinQueueProps {
    queue: QueueAttendee;
    backends: {[backend_type: string]: string};
    onJoinQueue: (backend: string) => void;
    disabled: boolean;
    selectedBackend: string;
    onChangeSelectedBackend: (backend: string) => void;
}

const JoinQueue: React.FC<JoinQueueProps> = (props) => {
    return (
        <>
        <div className="row col-lg">
            <p className="mb-0">Select Meeting Type</p>
            <p className="mb-0 required">*</p>
        </div>
        <BackendSelector backends={props.backends} allowedBackends={new Set(props.queue.allowed_backends)}
            onChange={props.onChangeSelectedBackend} selectedBackend={props.selectedBackend}/>
        <div className="row">
            <div className="col-lg">
                <button disabled={props.disabled} onClick={() => props.onJoinQueue(props.selectedBackend)} type="button" className="btn btn-primary bottom-content">
                    Join Queue
                </button>
            </div>
        </div>
        </>
    );
}

interface QueueAttendingProps {
    queue: QueueAttendee;
    backends: {[backend_type: string]: string};
    user: User;
    joinedQueue?: QueueAttendee | null;
    disabled: boolean;
    onJoinQueue: (backend: string) => void;
    onLeaveQueue: () => void;
    onLeaveAndJoinQueue: (backend: string) => void;
    onChangeAgenda: (agenda: string) => void;
    onShowDialog: () => void;
    onChangeBackendType: (oldBackendType: string, backend: string) => void;
    selectedBackend: string;
    onChangeBackend: (backend: string) => void;
}

function QueueAttendingNotJoined(props: QueueAttendingProps) {
    const joinedOther = props.joinedQueue && props.joinedQueue.id !== props.queue.id;
    
    const controls = props.queue.status !== "closed" && (
        joinedOther && props.joinedQueue
            ? (
                <>
                <div className="row">
                    <div className="col-lg">
                        <JoinedQueueAlert joinedQueue={props.joinedQueue}/>
                    </div>
                </div>
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
        <div className="row">
            <ul>
                <li>Number of people currently in line: <strong>{props.queue.line_length}</strong></li>
                <li>You are not in the meeting queue yet</li>
            </ul>
        </div>
        {controls}
        </>
    );
}

const TurnNowAlert = () =>
    <div className="alert alert-success" role="alert">
        <strong>It's your turn!</strong> If you haven't already joined the meeting, follow the directions to join it now!
    </div>

const TurnSoonAlert = () =>
    <div className="alert alert-warning" role="alert">
        <strong>Your turn is coming up!</strong> Follow the directions to join the meeting now so you are ready when it's your turn.
    </div>

interface BlueJeansMeetingInfoProps {
    metadata: BluejeansMetadata;
}

const BlueJeansMeetingInfo: React.FC<BlueJeansMeetingInfoProps> = (props) => {
    const meetingNumber = props.metadata.numeric_meeting_id;
    const joinLink = 
        <a href={props.metadata.meeting_url} target="_blank" className="btn btn-warning">
            Join Meeting
        </a>
    const docLink = 'https://its.umich.edu/communication/videoconferencing/blue-jeans/getting-started'
    const docLinkTag = <a href={docLink} target='_blank' className='card-link'>How to use BlueJeans at U-M</a>

    return (
        <>
        {joinLink}
        {props.children}     
        <div className="row bottom-content">
            <div className="col-sm">
                <div className="card card-body">
                    <h5 className="card-title mt-0">Joining the Meeting</h5>
                    <p className="card-text">
                        You can join the meeting now to make sure you are set up and ready. Download the app and test your
                        audio before it is your turn. Refer to {docLinkTag} for additional help getting started.
                    </p>
                </div>
            </div>
            <div className="col-sm">
                <div className="card card-body">
                    <h5 className="card-title mt-0">Having Trouble with Video?</h5>
                    <p className="card-text">
                    <BlueJeansDialInMessage meetingNumber={meetingNumber} /> You are not a moderator, so you do not need a moderator passcode.
                    </p>
                </div>
            </div>
        </div>
        </>
    );
}

function QueueAttendingJoined(props: QueueAttendingProps) {
    const closedAlert = props.queue.status === "closed"
        && <Alert variant="dark">This queue has been closed by the host, but you are still in line. Please contact the host to ensure the meeting will still happen.</Alert>
    const alert = props.queue.my_meeting!.line_place === 0
        ? <TurnNowAlert/>
        : props.queue.my_meeting!.line_place && props.queue.my_meeting!.line_place <= 5
            ? <TurnSoonAlert/>
            : undefined;
    const meetingInfo = props.queue.my_meeting!.backend_type === "bluejeans"
            ? <BlueJeansMeetingInfo metadata={props.queue.my_meeting!.backend_metadata as BluejeansMetadata}>
                <button disabled={props.disabled} onClick={() => props.onLeaveQueue()} type="button" className="btn btn-link">
                    Leave the line
                    {props.disabled && DisabledMessage}
                </button>
            </BlueJeansMeetingInfo>
            : <button disabled={props.disabled} onClick={() => props.onLeaveQueue()} type="button" className="btn btn-link">
                Leave the line
                {props.disabled && DisabledMessage}
            </button>;
    const changeMeetingType = props.queue.my_meeting?.assignee 
        ? <small className="card-text-spacing meeting-type-message">A Host has been assigned to this meeting. Meeting Type can no longer be changed.</small>
        : <button disabled={props.disabled} onClick={props.onShowDialog} type="button" className="btn btn-link">Change</button>;
    const agendaText = props.queue.my_meeting!.agenda
    return (
        <>
            {closedAlert}
            {alert}
            <h3>You are currently in line.</h3>
            <Card bsPrefix='card card-middle card-width center-align'>
                <Card.Body>
                    <Card.Text>Your number in line: <strong>{props.queue.my_meeting!.line_place + 1}</strong></Card.Text>
                    <Card.Text>Time Joined: <strong><DateTimeDisplay dateTime={props.queue.my_meeting!.created_at}/></strong></Card.Text>
                    <Card.Text>
                        Meeting via: <strong>{props.backends[props.queue.my_meeting!.backend_type]}</strong>
                        {changeMeetingType}
                    </Card.Text>
                    <Card.Text>Meeting Agenda (Optional)</Card.Text>
                    <Card.Text><small>Let the host(s) know the topic you wish to discuss.</small></Card.Text>
                    <EditToggleField
                        id='agenda'
                        value={agendaText}
                        placeholder=''
                        buttonType='success'
                        disabled={props.disabled}
                        onSubmit={props.onChangeAgenda}
                        fieldComponent={StatelessInputGroupForm}
                        fieldSchema={meetingAgendaSchema}
                        showRemaining={true}
                        initialState={!agendaText}
                    >
                        Update
                    </EditToggleField>
                </Card.Body>
            </Card>
            <p>
                The host will join the meeting when it is your turn.
                We'll show a message in this window when your turn is coming up -- keep an eye on the window so you don't miss it!
            </p>
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
    backends: {[backend_type: string]: string};
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

interface QueuePageParams {
    queue_id: string;
}

export function QueuePage(props: PageProps<QueuePageParams>) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }
    const queue_id = props.match.params.queue_id;
    if (queue_id === undefined) throw new Error("queue_id is undefined!");
    if (!props.user) throw new Error("user is undefined!");
    const dialogRef = createRef<Dialog>();
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
    //Setup interactions
    const joinQueue = async (backendType: string) => {
        ReactGA.event({
            category: "Attending",
            action: "Joined Queue",
        });
        await api.addMeeting(queueIdParsed, props.user!.id, backendType);
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
    const confirmLeaveQueue = () => {
        dialogRef.current!.show({
            title: "Leave Queue?",
            body: "The queue is closed, but you are still in line. If you leave now, you will not be able to rejoin until the queue is reopened.",
            actions: [
                Dialog.CancelAction(),
                Dialog.OKAction(() => {
                    doLeaveQueue();
                }),
            ],
        });
    }
    const leaveAndJoinQueue = async (backendType: string) => {
        ReactGA.event({
            category: "Attending",
            action: "Left Previous Queue and Joined New Queue",
        });
        await api.removeMeeting(myUser!.my_queue!.my_meeting!.id);
        await api.addMeeting(queueIdParsed, props.user!.id, backendType);
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
        && <QueueAttending queue={queue} backends={props.backends} user={props.user} joinedQueue={myUser?.my_queue} 
            disabled={isChanging} onJoinQueue={doJoinQueue} onLeaveQueue={queue.status === "closed" ? confirmLeaveQueue : doLeaveQueue}
            onLeaveAndJoinQueue={doLeaveAndJoinQueue} onChangeAgenda={doChangeAgenda}
            onShowDialog={() => setShowMeetingTypeDialog(true)}
            onChangeBackendType={doChangeBackendType}
            selectedBackend={selectedBackend} onChangeBackend={setSelectedBackend}/>
    const meetingTypeDialog = queue && selectedBackend
        && <ChangeMeetingTypeDialog queue={queue} backends={props.backends} show={showMeetingTypeDialog} 
            onClose={() => setShowMeetingTypeDialog(false)} 
            onSubmit={doChangeBackendType} selectedBackend={selectedBackend} 
            onChangeBackend={setSelectedBackend}/>
    return (
        <div>
            <Dialog ref={dialogRef}/>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl}/>
            {meetingTypeDialog}
            <Breadcrumbs currentPageTitle={queue?.name ?? queueIdParsed.toString()}/>
            {loadingDisplay}
            {errorDisplay}
            {queueDisplay}
        </div>
    );
}

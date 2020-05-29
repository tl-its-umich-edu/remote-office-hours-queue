import * as React from "react";
import { useState, useEffect, createRef } from "react";
import { Link } from "react-router-dom";
import * as ReactGA from "react-ga";
import Alert from "react-bootstrap/Alert"

import { User, QueueAttendee, BluejeansMetadata, MyUser } from "../models";
import { ErrorDisplay, LoadingDisplay, DisabledMessage, JoinedQueueAlert, LoginDialog, BlueJeansOneTouchDialLink, Breadcrumbs, BlueJeansDialInMessage } from "./common";
import * as api from "../services/api";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { usePromise } from "../hooks/usePromise";
import { redirectToLogin, redirectToSearch } from "../utils";
import { PageProps } from "./page";
import Dialog from "react-bootstrap-dialog";

interface QueueAttendingProps {
    queue: QueueAttendee;
    user: User;
    joinedQueue?: QueueAttendee | null;
    disabled: boolean;
    onJoinQueue: () => void;
    onLeaveQueue: () => void;
    onLeaveAndJoinQueue: () => void;
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
                <div className="row">
                    <div className="col-lg">
                        <button disabled={props.disabled} onClick={props.onLeaveAndJoinQueue} type="button" className="btn btn-primary">
                            Join Queue
                        </button>
                    </div>
                </div>
                </>
            )
            : (
                <div className="row">
                    <div className="col-lg">
                        <button disabled={props.disabled} onClick={props.onJoinQueue} type="button" className="btn btn-primary">
                            Join Queue
                        </button>
                    </div>
                </div>
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
        <strong>It's your turn!</strong> If you haven't already joined the meeting, follow the directions on the right to join it now!
    </div>

const TurnSoonAlert = () =>
    <div className="alert alert-warning" role="alert">
        <strong>Your turn is coming up!</strong> Follow the directions on the right to join the meeting now so you are ready when it's your turn.
    </div>

interface HowToBlueJeansProps {
    metadata: BluejeansMetadata;
}

function HowToBlueJeans(props: HowToBlueJeansProps) {
    const joinLink = (
        <a href={props.metadata.meeting_url} target="_blank" className="card-link">
            Join the Meeting
        </a>
    );
    const meetingNumber = props.metadata.numeric_meeting_id;
    return (
        <div className="card-body">
            <h5 className="card-title">Join the BlueJeans Meeting</h5>
            <p className="card-text">Join now so you can make sure you are set up and ready. Download the app and test your audio before it is your turn.</p>
            <p className="card-text"><BlueJeansDialInMessage meetingNumber={meetingNumber} /> You are not a moderator, so you do not need a moderator passcode.</p>
            {joinLink}
            <a href="https://its.umich.edu/communication/videoconferencing/blue-jeans/getting-started" target="_blank" className="card-link">How to use BlueJeans at U-M</a>
        </div>
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
    const howTo = props.queue.my_meeting!.backend_type === "bluejeans"
        ? <HowToBlueJeans metadata={props.queue.my_meeting!.backend_metadata as BluejeansMetadata}/>
        : undefined;
    return (
        <>
        {closedAlert}
        <div className="row">
            <div className="col-lg">
                {alert}
                <ul>
                    <li>You are in line and there are <strong>{props.queue.my_meeting!.line_place} people</strong> in line ahead of you</li>
                    <li>The host will join the meeting when it is your turn</li>
                    <li>We'll show a message in this window when your turn is coming up--keep an eye on the window so you don't miss it!</li>
                </ul>
            </div>
            <div className="col-sm">
                <div className="card">
                    {howTo}
                </div>
            </div>
        </div>
        <div className="row">
            <div className="col-lg">
                <button disabled={props.disabled} onClick={() => props.onLeaveQueue()} type="button" className="btn btn-warning">
                    Leave the line
                    {props.disabled && DisabledMessage}
                </button>
            </div>
        </div>
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
    const [queue, setQueue] = useState(undefined as QueueAttendee | undefined);
    const refresh = () => api.getQueue(queueIdParsed);
    const [doRefresh, refreshLoading, refreshError] = usePromise(refresh, setQueue);
    useEffect(() => {
        if (isNaN(queueIdParsed)) {
            return redirectToSearch(queue_id);
        }
        doRefresh().catch((err: Error) => {
            if (err.message === "Not Found") {
                redirectToSearch(queue_id);
            }
        });
    }, []);
    const [interactions] = useAutoRefresh(doRefresh);
    const [myUser, setMyUser] = useState(undefined as MyUser | undefined);
    const refreshMyUser = () => api.getMyUser(props.user!.id);
    const [doRefreshMyUser, refreshMyUserLoading, refreshMyUserError] = usePromise(refreshMyUser, setMyUser);
    useEffect(() => {
        doRefreshMyUser();
    }, []);
    useAutoRefresh(doRefreshMyUser, 10000);

    //Setup interactions
    const joinQueue = async () => {
        interactions.next(false);
        ReactGA.event({
            category: "Attending",
            action: "Joined Queue",
        });
        await api.addMeeting(queueIdParsed, props.user!.id);
        await doRefresh();
    }
    const [doJoinQueue, joinQueueLoading, joinQueueError] = usePromise(joinQueue);
    const leaveQueue = async () => {
        interactions.next(false);
        ReactGA.event({
            category: "Attending",
            action: "Left Queue",
        });
        await api.removeMeeting(queue!.my_meeting!.id);
        await doRefresh();
    }
    const [doLeaveQueue, leaveQueueLoading, leaveQueueError] = usePromise(leaveQueue);
    const confirmLeaveQueue = () => {
        interactions.next(false);
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
    const leaveAndJoinQueue = async () => {
        interactions.next(false);
        ReactGA.event({
            category: "Attending",
            action: "Left Previous Queue and Joined New Queue",
        });
        await api.removeMeeting(myUser!.my_queue!.my_meeting!.id);
        await api.addMeeting(queueIdParsed, props.user!.id);
        await doRefresh();
    }
    const [doLeaveAndJoinQueue, leaveAndJoinQueueLoading, leaveAndJoinQueueError] = usePromise(leaveAndJoinQueue);

    //Render
    const isChanging = joinQueueLoading || leaveQueueLoading || leaveAndJoinQueueLoading;
    const isLoading = refreshLoading || isChanging || refreshMyUserLoading;
    const errorTypes = [refreshError, joinQueueError, leaveQueueError, refreshMyUserError, leaveAndJoinQueueError];
    const error = errorTypes.find(e => e);
    const loginDialogVisible = errorTypes.some(e => e?.name === "ForbiddenError");
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay error={error}/>
    const queueDisplay = queue
        && <QueueAttending queue={queue} user={props.user} joinedQueue={myUser?.my_queue} 
            disabled={isChanging} onJoinQueue={doJoinQueue} onLeaveQueue={queue.status === "closed" ? confirmLeaveQueue : doLeaveQueue}
            onLeaveAndJoinQueue={doLeaveAndJoinQueue} />
    return (
        <div>
            <Dialog ref={dialogRef}/>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl}/>
            <Breadcrumbs currentPageTitle={queue?.name ?? queueIdParsed.toString()}/>
            {loadingDisplay}
            {errorDisplay}
            {queueDisplay}
        </div>
    );
}

import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { User, AttendingQueue } from "../models";
import { UserDisplay } from "./common";
import { useState, useEffect } from "react";
import { getQueueAttendingFake as apiGetQueueAttending, joinQueueFake as apiJoinQueue, leaveQueueFake as apiLeaveQueue } from "../services/api";

interface QueueAttendingProps {
    queue: AttendingQueue;
    user: User;
    joinQueue: () => void;
    leaveQueue: () => void;
}

function QueueAttendingNotJoined(props: QueueAttendingProps) {
    return (
        <>
        <div className="row">
            <ul className="col-lg">
                <li>Number of people currently in line: <strong>{props.queue.queue_length}</strong></li>
                <li>You are not in the meeting queue yet</li>
            </ul>
        </div>
        <div className="row">
            <div className="col-lg">
                <button onClick={() => props.joinQueue()} type="button" className="btn btn-primary">Join the line</button>
            </div>
        </div>
        </>
    );
}

const TurnNowAlert = () =>
    <div className="alert alert-success" role="alert">
        <strong>It's your turn!</strong> If you haven't already joined the meeting, join it now!
    </div>

const TurnSoonAlert = () =>
    <div className="alert alert-warning" role="alert">
        <strong>Your turn is coming up!</strong> Join the meeting now so you are ready when the host joins.
    </div>

function QueueAttendingJoined(props: QueueAttendingProps) {
    const alert = props.queue.queued_ahead === 0
        ? <TurnNowAlert/>
        : props.queue.queued_ahead && props.queue.queued_ahead <= 5
            ? <TurnSoonAlert/>
            : undefined;
    return (
        <>
        <div className="row">
            <div className="col-lg">
                {alert}
                <ul>
                    <li>You are in line to meet with the host.</li>
                    <li>There are <strong>{props.queue.queued_ahead} people</strong> in line ahead of you</li>
                    <li>The host will join the BlueJeans meeting when it is your turn</li>
                    <li>We'll show a message in this window when your turn is coming up--keep an eye on the window so you don't miss it!</li>
                </ul>
            </div>
            <div className="col-sm">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">Join the BlueJeans Meeting</h5>
                        <p className="card-text">Join now so you can make sure you are set up and ready. Download the app and test your audio before it is your turn.</p>
                        <p className="card-text">Having problems with video? As a back-up, you can call 1.312.216.0325 from the USA (or 1.416.900.2956 from Canada) from any phone and enter BLUEJEANS_NUMBER_HERE#. You are not a moderator, so you do not need a moderator passcode.</p>
                        <a href="BLUEJEANS_NUMBER_HERE" target="_blank" className="card-link">Join the meeting</a>
                        <a href="https://its.umich.edu/communication/videoconferencing/blue-jeans/getting-started" target="_blank" className="card-link">How to use BlueJeans at U-M</a>
                    </div>
                </div>
            </div>
        </div>
        <div className="row">
            <div className="col-lg">
                <button onClick={() => props.leaveQueue()} type="button" className="btn btn-warning">Leave the line</button>
            </div>
        </div>
        </>
    );
}

function QueueAttending(props: QueueAttendingProps) {
    const content = props.queue.queued_ahead === undefined
        ? <QueueAttendingNotJoined {...props}/>
        : <QueueAttendingJoined {...props}/>
    const yourQueueAlert = props.queue.hosts.find(h => h.username === props.user.username)
        ? <p className="alert alert-info col-lg">
            This is your queue, you can <Link to={"/manage/" + props.queue.id}>manage it</Link>.
        </p>
        : undefined;
    return (
        <>
        <h1>Manage Your One-on-One Meeting Queue</h1>
        {content}
        {yourQueueAlert}
        </>
    );
}

interface QueuePageProps {
    user?: User;
}

export function QueuePage(props: QueuePageProps) {
    const { queue_id } = useParams();
    if (queue_id === undefined) throw new Error("queue_id is undefined!");
    if (!props.user) throw new Error("user is undefined!");
    const queueIdParsed = parseInt(queue_id);
    const [queue, setQueue] = useState(undefined as AttendingQueue | undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const refresh = () => {
        setIsLoading(true);
        apiGetQueueAttending(queueIdParsed, props.user!.username)
            .then((data) => {
                setQueue(data);
                setIsLoading(false);
            })
            .catch((error) => {
                setError(error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }
    useEffect(() => {
        refresh();
    }, []);
    const joinQueue = () => {
        setIsLoading(true);
        apiJoinQueue(queueIdParsed, props.user!.username)
            .then((q) => setQueue(q))
            .catch((error) => {
                setError(error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }
    const leaveQueue = () => {
        setIsLoading(true);
        apiLeaveQueue(queueIdParsed, props.user!.username)
            .then((q) => setQueue(q))
            .catch((error) => {
                setError(error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }
    const loadingDisplay = isLoading
        ? <span>Loading...</span>
        : undefined;
    const errorDisplay = error
        ? <p className="alert alert-danger">{error}</p>
        : undefined;
    const queueDisplay = queue !== undefined
        ? <QueueAttending queue={queue} user={props.user} joinQueue={joinQueue} leaveQueue={leaveQueue}/>
        : undefined;
    return (
        <div className="container-fluid content">
            {loadingDisplay}
            {errorDisplay}
            {queueDisplay}
        </div>
    );
}

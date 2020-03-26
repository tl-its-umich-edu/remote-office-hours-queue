import * as React from "react";
import { removeMeetingFake, addMeetingFake, removeHostFake, addHostFake, getQueueFake, getUsersFake } from "../services/api";
import { User, ManageQueue, Meeting } from "../models";
import { UserDisplay, RemoveButton, AddButton, ErrorDisplay, LoadingDisplay } from "./common";
import { Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { usePromise } from "../hooks/usePromise";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { redirectToLogin } from "../utils";

interface MeetingEditorProps {
    meeting: Meeting;
    remove: () => void;
    disabled: boolean;
}

function MeetingEditor(props: MeetingEditorProps) {
    const user = props.meeting.attendees[0]!.user;
    return (
        <dd>
            <UserDisplay user={user}/>
            <span className="float-right">
                <RemoveButton remove={props.remove} size="sm" disabled={props.disabled}/>
            </span>
        </dd>
    );
}

interface HostEditorProps {
    host: User;
    remove?: () => void;
    disabled: boolean;
}

function HostEditor(props: HostEditorProps) {
    const removeButton = props.remove
        ? <RemoveButton remove={props.remove} size="sm" disabled={props.disabled}/>
        : undefined;
    return (
        <span>
            <UserDisplay user={props.host}/>
            {removeButton}
        </span>
    );
}

interface QueueEditorProps {
    queue: ManageQueue;
    addMeeting: () => void;
    removeMeeting: (m: Meeting) => void;
    addHost: () => void;
    removeHost: (h: User) => void;
    disabled: boolean;
}

function QueueEditor(props: QueueEditorProps) {
    const hosts = props.queue.hosts.map(h =>
        <dd>
            <HostEditor host={h} remove={() => props.removeHost(h)} disabled={props.disabled}/>
        </dd>
    );
    const meetings = props.queue.meetings.map(m =>
        <li className="list-group-item">
            <MeetingEditor meeting={m} remove={() => props.removeMeeting(m)} disabled={props.disabled}/>
        </li>
    );
    return (
        <div>
            <h1>Manage: {props.queue.name}</h1>
            <div>
                <Link to={"/queue/" + props.queue.id}>
                    See this queue as a visitor
                </Link>
            </div>
            <dl>
                <dt>ID</dt>
                <dd>{props.queue.id}</dd>
                <dt>Name</dt>
                <dd>{props.queue.name}</dd>
                <dt>Created At</dt>
                <dd>{props.queue.created_at}</dd>
                <dt>Hosted By</dt>
                {hosts}
                <AddButton add={() => props.addHost()} disabled={props.disabled} size="sm"> Add Host</AddButton>
            </dl>
            <h3>Queued Meetings</h3>
            <ol className="list-group">
                {meetings}
            </ol>
            <AddButton add={() => props.addMeeting()} disabled={props.disabled}> Force Add Attendee</AddButton>
        </div>
    );
}

interface QueueEditorPageProps {
    user?: User;
}

export function QueueEditorPage(props: QueueEditorPageProps) {
    if (!props.user) {
        redirectToLogin()
    }
    const { queue_id } = useParams();
    if (queue_id === undefined) throw new Error("queue_id is undefined!");
    if (!props.user) throw new Error("user is undefined!");
    const queueIdParsed = parseInt(queue_id);
    const [queue, setQueue] = useState(undefined as ManageQueue | undefined);
    const [doRefresh, refreshLoading, refreshError] = usePromise(() => getQueueFake(queueIdParsed), setQueue);
    useEffect(() => {
        doRefresh();
    }, []);
    const [interactions] = useAutoRefresh(doRefresh);
    const [users, setUsers] = useState(undefined as User[] | undefined);
    const [doRefreshUsers, refreshUsersLoading, refreshUsersError] = usePromise(() => getUsersFake(), setUsers);
    useEffect(() => {
        doRefreshUsers();
    }, []);
    const removeHost = async (h: User) => {
        interactions.next(true);
        return await removeHostFake(queue!.id, h.username);
    }
    const [doRemoveHost, removeHostLoading, removeHostError] = usePromise(removeHost, setQueue);
    const addHost = async () => {
        interactions.next(true);
        const uniqname = prompt("Uniqname?", "aaaaaaaa");
        if (!uniqname) return;
        const user = users!.find(u => u.username === uniqname);
        if (!user) throw new Error(user + " is not a valid user.");
        interactions.next(true);
        return await addHostFake(queue!.id, user.id);
    }
    const [doAddHost, addHostLoading, addHostError] = usePromise(addHost, setQueue);
    const removeMeeting = async (m: Meeting) => {
        interactions.next(true);
        return await removeMeetingFake(queue!.id, m.id);
    }
    const [doRemoveMeeting, removeMeetingLoading, removeMeetingError] = usePromise(removeMeeting, setQueue);
    const addMeeting = async () => {
        interactions.next(true);
        const uniqname = prompt("Uniqname?", "johndoe");
        if (!uniqname) return;
        interactions.next(true);
        return await addMeetingFake(queue!.id, uniqname);
    }
    const [doAddMeeting, addMeetingLoading, addMeetingError] = usePromise(addMeeting, setQueue);
    const isChanging = removeHostLoading || addHostLoading || removeMeetingLoading || addMeetingLoading;
    const isLoading = refreshLoading || isChanging;
    const error = refreshError || removeHostError || addHostError || removeMeetingError || addMeetingError;
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay error={error}/>
    const queueEditor = queue
        && <QueueEditor queue={queue} disabled={isChanging}
            addHost={doAddHost} removeHost={doRemoveHost} 
            addMeeting={doAddMeeting} removeMeeting={doRemoveMeeting} />
    return (
        <>
        {loadingDisplay}
        {errorDisplay}
        {queueEditor}
        </>
    );
}

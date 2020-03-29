import * as React from "react";
import { removeMeeting as apiRemoveMeeting, addMeeting as apiAddMeeting, removeHost as apiRemoveHost, addHost as apiAddHost, getQueue as apiGetQueue, getUsers as apiGetUsers } from "../services/api";
import { User, ManageQueue, Meeting } from "../models";
import { UserDisplay, RemoveButton, ErrorDisplay, LoadingDisplay, SingleInputForm, invalidUniqnameMessage, DateDisplay } from "./common";
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
    const user = props.meeting.attendees[0];
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
    addMeeting: (uniqname: string) => void;
    removeMeeting: (m: Meeting) => void;
    addHost: (uniqname: string) => void;
    removeHost: (h: User) => void;
    disabled: boolean;
}

function QueueEditor(props: QueueEditorProps) {
    const lastHost = props.queue.hosts.length === 1;
    const hosts = props.queue.hosts.map(h =>
        <dd>
            <HostEditor host={h} remove={() => props.removeHost(h)} disabled={props.disabled || lastHost}/>
        </dd>
    );
    const meetings = props.queue.meeting_set.map(m =>
        <li className="list-group-item">
            <MeetingEditor meeting={m} remove={() => props.removeMeeting(m)} disabled={props.disabled}/>
        </li>
    );
    const absoluteUrl = `${location.origin}/queue/${props.queue.id}`;
    return (
        <div>
            <h1>Manage: <strong>{props.queue.name}</strong></h1>
            <p>
                <Link to={"/queue/" + props.queue.id}>
                    View as visitor
                </Link>
            </p>
            <dl>
                <dt>Queue URL:</dt>
                <dd><a href={absoluteUrl}>{absoluteUrl}</a></dd>
                <dt>Created:</dt>
                <dd><DateDisplay date={props.queue.created_at}/></dd>
                <dt>Hosted By:</dt>
                {hosts}
                <SingleInputForm 
                    placeholder="Uniqname..."
                    buttonType="success"
                    onSubmit={props.addHost}
                    disabled={props.disabled}>
                        + Add Host
                </SingleInputForm>
            </dl>
            <h3>Meetings Up Next</h3>
            <ol className="list-group">
                {meetings}
            </ol>
            <SingleInputForm
                placeholder="Uniqname..."
                buttonType="success"
                onSubmit={props.addMeeting}
                disabled={props.disabled}>
                    + Add Attendee
            </SingleInputForm>
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
    const [doRefresh, refreshLoading, refreshError] = usePromise(() => apiGetQueue(queueIdParsed) as Promise<ManageQueue>, setQueue);
    useEffect(() => {
        doRefresh();
    }, []);
    const [interactions] = useAutoRefresh(doRefresh);
    const [users, setUsers] = useState(undefined as User[] | undefined);
    const [doRefreshUsers, refreshUsersLoading, refreshUsersError] = usePromise(() => apiGetUsers(), setUsers);
    useEffect(() => {
        doRefreshUsers();
    }, []);
    const removeHost = async (h: User) => {
        interactions.next(true);
        await apiRemoveHost(queue!.id, h.id);
        await doRefresh();
    }
    const [doRemoveHost, removeHostLoading, removeHostError] = usePromise(removeHost);
    const addHost = async (uniqname: string) => {
        interactions.next(true);
        const user = users!.find(u => u.username === uniqname);
        if (!user) throw new Error(invalidUniqnameMessage(uniqname));
        interactions.next(true);
        await apiAddHost(queue!.id, user.id);
        await doRefresh();
    }
    const [doAddHost, addHostLoading, addHostError] = usePromise(addHost);
    const removeMeeting = async (m: Meeting) => {
        interactions.next(true);
        await apiRemoveMeeting(m.id);
        await doRefresh();
    }
    const [doRemoveMeeting, removeMeetingLoading, removeMeetingError] = usePromise(removeMeeting);
    const addMeeting = async (uniqname: string) => {
        interactions.next(true);
        const user = users!.find(u => u.username === uniqname);
        if (!user) throw new Error(invalidUniqnameMessage(uniqname));
        interactions.next(true);
        await apiAddMeeting(queue!.id, user.id);
        await doRefresh();
    }
    const [doAddMeeting, addMeetingLoading, addMeetingError] = usePromise(addMeeting);
    const isChanging = removeHostLoading || addHostLoading || removeMeetingLoading || addMeetingLoading;
    const isLoading = refreshLoading || refreshUsersLoading || isChanging;
    const error = refreshError || refreshUsersError || removeHostError || addHostError || removeMeetingError || addMeetingError;
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

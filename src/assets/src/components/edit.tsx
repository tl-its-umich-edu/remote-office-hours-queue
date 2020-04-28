import * as React from "react";
import { useState, useEffect, createRef, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import * as ReactGA from "react-ga";
import Dialog from "react-bootstrap-dialog";

import { removeMeeting as apiRemoveMeeting, addMeeting as apiAddMeeting, removeHost as apiRemoveHost, addHost as apiAddHost, getQueue as apiGetQueue, getUsers as apiGetUsers, changeQueueName as apiChangeQueueName, changeQueueDescription as apiChangeQueueDescription, deleteQueue as apiRemoveQueue, setStatus as apiSetStatus } from "../services/api";
import { User, ManageQueue, Meeting, BluejeansMetadata } from "../models";
import { UserDisplay, RemoveButton, ErrorDisplay, LoadingDisplay, SingleInputForm, invalidUniqnameMessage, DateDisplay, CopyField, EditToggleField, LoginDialog } from "./common";
import { usePromise } from "../hooks/usePromise";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { redirectToLogin, sanitizeUniqname, validateUniqname } from "../utils";
import { PageProps } from "./page";

interface MeetingEditorProps {
    meeting: Meeting;
    remove: () => void;
    disabled: boolean;
}

function MeetingEditor(props: MeetingEditorProps) {
    const user = props.meeting.attendees[0];
    const joinUrl = props.meeting.backend_type === "bluejeans"
        ? (props.meeting.backend_metadata as BluejeansMetadata).meeting_url
        : undefined;
    const joinLink = joinUrl && (
        <a href={joinUrl} target="_blank" className="btn btn-primary btn-sm mr-2" aria-label={`Start Meeting with ${user.first_name} ${user.last_name}`}>
            Start Meeting
        </a>
    );
    return (
        <dd>
            <UserDisplay user={user}/>
            <span className="float-right">
                {joinLink}
                <RemoveButton remove={props.remove} size="sm" disabled={props.disabled} screenReaderLabel={`Remove Meeting with ${user.first_name} ${user.last_name}`}/>
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
        ? <RemoveButton remove={props.remove} size="sm" disabled={props.disabled} screenReaderLabel="Remove Host"/>
        : undefined;
    return (
        <span>
            <UserDisplay user={props.host}/>
            <span className="float-right">{removeButton}</span>
        </span>
    );
}

interface QueueEditorProps {
    queue: ManageQueue;
    addMeeting: (uniqname: string) => void;
    removeMeeting: (m: Meeting) => void;
    addHost: (uniqname: string) => void;
    removeHost: (h: User) => void;
    changeName: (name: string) => void;
    changeDescription: (description: string) => void;
    removeQueue: () => void;
    setStatus: (open: boolean) => void;
    disabled: boolean;
}

function QueueEditor(props: QueueEditorProps) {
    const lastHost = props.queue.hosts.length === 1;
    const hosts = props.queue.hosts.map(h =>
        <li className="list-group-item" key={h.id}>
            <HostEditor host={h} remove={() => props.removeHost(h)} disabled={props.disabled || lastHost}/>
        </li>
    );
    const meetings = props.queue.meeting_set.map(m =>
        <li className="list-group-item" key={m.id}>
            <MeetingEditor meeting={m} remove={() => props.removeMeeting(m)} disabled={props.disabled}/>
        </li>
    );
    const absoluteUrl = `${location.origin}/queue/${props.queue.id}`;
    const toggleStatus = (e: ChangeEvent<HTMLInputElement>) => {
        console.log("ToggleStatus")
        props.setStatus(e.target.checked);
    }
    return (
        <div>
            <div className="float-right">
                <button onClick={props.removeQueue} disabled={props.disabled} className="btn btn-danger">
                    Delete Queue
                </button>
            </div>
            <h1 className="form-inline">
                <span className="mr-2">Manage: </span>
                <EditToggleField text={props.queue.name} disabled={props.disabled} id="name"
                    onSubmit={props.changeName} buttonType="success" placeholder="New name...">
                        Change
                </EditToggleField>
            </h1>

            <p>
                <Link to={"/queue/" + props.queue.id}>
                    View as visitor
                </Link>
            </p>
            <div>
                <div className="form-group row">
                    <label htmlFor="url" className="col-md-2 col-form-label">Queue URL:</label>
                    <div className="col-md-6">
                        <CopyField text={absoluteUrl} id="url"/>
                    </div>
                </div>
                <div className="form-group row">
                    <label className="col-md-2 col-form-label">Created:</label>
                    <div className="col-md-6">
                        <DateDisplay date={props.queue.created_at}/>
                    </div>
                </div>
                <div className="form-group row">
                    <label htmlFor="status" className="col-md-2 col-form-label">Status:</label>
                    <div className="col-md-6">
                        <div className="custom-control custom-switch">
                            <input type="checkbox" id="status" className="custom-control-input" checked={props.queue.status === "open"} onChange={toggleStatus}/>
                            <label htmlFor="status" className="custom-control-label">{props.queue.status === "open" ? "Open" : "Closed"}</label>
                        </div>
                    </div>
                </div>
                <div className="form-group row">
                    <label htmlFor="description" className="col-md-2 col-form-label">Description:</label>
                    <div className="col-md-6">
                        <EditToggleField text={props.queue.description} disabled={props.disabled} id="description"
                            onSubmit={props.changeDescription} buttonType="success" placeholder="New description...">
                                Change
                        </EditToggleField>
                    </div>
                </div>
                <div className="row">
                    <label className="col-md-2 col-form-label">Hosted By:</label>
                    <div className="col-md-6">
                        <ul className="list-group">
                            {hosts}
                        </ul>
                        <SingleInputForm 
                            id="add_host"
                            placeholder="Uniqname..."
                            buttonType="success"
                            onSubmit={props.addHost}
                            disabled={props.disabled}>
                                + Add Host
                        </SingleInputForm>
                    </div>
                </div>
            </div>
            <h3>Meetings Up Next</h3>
            <div className="row">
                <div className="col-md-8">
                    <ol className="list-group">
                        {meetings}
                    </ol>
                </div>
            </div>
            <div className="row">
                <div className="col-md-4">
                    <SingleInputForm
                        id="add_attendee"
                        placeholder="Uniqname..."
                        buttonType="success"
                        onSubmit={props.addMeeting}
                        disabled={props.disabled}>
                            + Add Attendee
                    </SingleInputForm>
                </div>
            </div>
        </div>
    );
}

const recordQueueManagementEvent = (action: string) => {
    ReactGA.event({
        category: "Queue Management",
        action,
    });
}

interface EditPageParams {
    queue_id: string;
}

export function QueueEditorPage(props: PageProps<EditPageParams>) {
    if (!props.user) {
        redirectToLogin();
    }
    const queue_id = props.match.params.queue_id;
    if (queue_id === undefined) throw new Error("queue_id is undefined!");
    if (!props.user) throw new Error("user is undefined!");
    const dialogRef = createRef<Dialog>();
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
    useAutoRefresh(doRefreshUsers, 6000);
    const removeHost = async (h: User) => {
        interactions.next(true);
        recordQueueManagementEvent("Removed Host");
        await apiRemoveHost(queue!.id, h.id);
        await doRefresh();
    }
    const [doRemoveHost, removeHostLoading, removeHostError] = usePromise(removeHost);
    const confirmRemoveHost = (h: User) => {
        interactions.next(true);
        dialogRef.current!.show({
            title: "Remove Host?",
            body: `Are you sure you want to remove host ${h.username}?`,
            actions: [
                Dialog.CancelAction(),
                Dialog.OKAction(() => {
                    doRemoveHost(h);
                }),
            ],
        });
    }
    const addHost = async (uniqname: string) => {
        interactions.next(true);
        uniqname = sanitizeUniqname(uniqname);
        validateUniqname(uniqname);
        const user = users!.find(u => u.username === uniqname);
        if (!user) throw new Error(invalidUniqnameMessage(uniqname));
        recordQueueManagementEvent("Added Host");
        await apiAddHost(queue!.id, user.id);
        await doRefresh();
    }
    const [doAddHost, addHostLoading, addHostError] = usePromise(addHost);
    const removeMeeting = async (m: Meeting) => {
        interactions.next(true);
        recordQueueManagementEvent("Removed Meeting");
        await apiRemoveMeeting(m.id);
        await doRefresh();
    }
    const [doRemoveMeeting, removeMeetingLoading, removeMeetingError] = usePromise(removeMeeting);
    const confirmRemoveMeeting = (m: Meeting) => {
        interactions.next(true);
        dialogRef.current!.show({
            title: "Remove Meeting?",
            body: `Are you sure you want to remove your meeting with ${m.attendees[0].first_name} ${m.attendees[0].last_name}?`,
            actions: [
                Dialog.CancelAction(),
                Dialog.OKAction(() => {
                    doRemoveMeeting(m);
                }),
            ],
        });
    }
    const addMeeting = async (uniqname: string) => {
        interactions.next(true);
        uniqname = sanitizeUniqname(uniqname);
        validateUniqname(uniqname);
        const user = users!.find(u => u.username === uniqname);
        if (!user) throw new Error(invalidUniqnameMessage(uniqname));
        recordQueueManagementEvent("Added Meeting");
        await apiAddMeeting(queue!.id, user.id);
        await doRefresh();
    }
    const [doAddMeeting, addMeetingLoading, addMeetingError] = usePromise(addMeeting);
    const changeName = async (name: string) => {
        interactions.next(true);
        recordQueueManagementEvent("Changed Name");
        return await apiChangeQueueName(queue!.id, name);
    }
    const [doChangeName, changeNameLoading, changeNameError] = usePromise(changeName, setQueue);
    const changeDescription = async (description: string) => {
        interactions.next(true);
        recordQueueManagementEvent("Changed Description");
        return await apiChangeQueueDescription(queue!.id, description);
    }
    const [doChangeDescription, changeDescriptionLoading, changeDescriptionError] = usePromise(changeDescription, setQueue);
    const removeQueue = async () => {
        interactions.next(true);
        recordQueueManagementEvent("Removed Host");
        await apiRemoveQueue(queue!.id);
        location.href = '/manage';
    }
    const [doRemoveQueue, removeQueueLoading, removeQueueError] = usePromise(removeQueue);
    const confirmRemoveQueue = () => {
        interactions.next(true);
        dialogRef.current!.show({
            title: "Delete Queue?",
            body: `Are you sure you want to permanently delete this queue?`,
            actions: [
                Dialog.CancelAction(),
                Dialog.OKAction(() => {
                    doRemoveQueue();
                }),
            ],
        });
    }
    const setStatus = async (open: boolean) => {
        interactions.next(true);
        recordQueueManagementEvent("Set Open/Close: " + open);
        return await apiSetStatus(queue!.id, open);
    }
    const [doSetStatus, setStatusLoading, setStatusError] = usePromise(setStatus, setQueue);
    const isChanging = removeHostLoading || addHostLoading || removeMeetingLoading || addMeetingLoading || changeNameLoading || changeDescriptionLoading || removeQueueLoading || setStatusLoading;
    const isLoading = refreshLoading || refreshUsersLoading || isChanging;
    const errorTypes = [refreshError, refreshUsersError, removeHostError, addHostError, removeMeetingError, addMeetingError, changeNameError, changeDescriptionError, removeQueueError, setStatusError];
    const error = errorTypes.find(e => e);
    const loginDialogVisible = errorTypes.some(e => e?.name === "ForbiddenError");
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay error={error}/>
    const queueEditor = queue
        && <QueueEditor queue={queue} disabled={isChanging}
            addHost={doAddHost} removeHost={confirmRemoveHost} 
            addMeeting={doAddMeeting} removeMeeting={confirmRemoveMeeting} 
            changeName={doChangeName} changeDescription={doChangeDescription}
            setStatus={doSetStatus} removeQueue={confirmRemoveQueue}/>
    return (
        <>
        <Dialog ref={dialogRef}/>
        <LoginDialog visible={loginDialogVisible}/>
        {loadingDisplay}
        {errorDisplay}
        {queueEditor}
        </>
    );
}

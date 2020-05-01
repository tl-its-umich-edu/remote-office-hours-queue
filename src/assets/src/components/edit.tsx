import * as React from "react";
import { useState, useEffect, createRef, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import * as ReactGA from "react-ga";
import Dialog from "react-bootstrap-dialog";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";

import * as api from "../services/api";
import { User, ManageQueue, Meeting, BluejeansMetadata } from "../models";
import { UserDisplay, RemoveButton, ErrorDisplay, LoadingDisplay, SingleInputForm, invalidUniqnameMessage, DateDisplay, CopyField, EditToggleField, LoginDialog, BlueJeansOneTouchDialLink, DateTimeDisplay } from "./common";
import { usePromise } from "../hooks/usePromise";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { redirectToLogin, sanitizeUniqname, validateUniqname } from "../utils";
import { PageProps } from "./page";
import { Subject } from "rxjs";

interface MeetingEditorProps {
    meeting: Meeting;
    disabled: boolean;
    onRemove: (m: Meeting) => void;
    onShowMeetingInfo: (m: Meeting) => void;
}

function MeetingEditor(props: MeetingEditorProps) {
    const user = props.meeting.attendees[0];
    const joinUrl = props.meeting.backend_type === "bluejeans"
        ? (props.meeting.backend_metadata as BluejeansMetadata).meeting_url
        : undefined;
    const joinLink = joinUrl 
        && (
            <a href={joinUrl} target="_blank" className="btn btn-primary btn-sm mr-2" aria-label={`Start Meeting with ${user.first_name} ${user.last_name}`}>
                Start Meeting
            </a>
        );
    const infoButton = (
        <Button onClick={() => props.onShowMeetingInfo(props.meeting)} variant="link" size="sm" className="mr-2">
            Join Info
        </Button>
    );
    return (
        <tr>
            <td>
                <UserDisplay user={user}/>
            </td>
            <td>
                {joinLink}
                {infoButton}
                <RemoveButton onRemove={() => props.onRemove(props.meeting)} size="sm" disabled={props.disabled} screenReaderLabel={`Remove Meeting with ${user.first_name} ${user.last_name}`}/>
            </td>
        </tr>
    );
}

interface HostEditorProps {
    host: User;
    disabled: boolean;
    onRemove?: (h: User) => void;
}

function HostEditor(props: HostEditorProps) {
    const removeButton = props.onRemove
        ? <RemoveButton onRemove={() => props.onRemove!(props.host)} size="sm" disabled={props.disabled} screenReaderLabel="Remove Host"/>
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
    disabled: boolean;
    onAddMeeting: (uniqname: string) => void;
    onRemoveMeeting: (m: Meeting) => void;
    onAddHost: (uniqname: string) => void;
    onRemoveHost: (h: User) => void;
    onChangeName: (name: string) => void;
    onChangeDescription: (description: string) => void;
    onRemoveQueue: () => void;
    onSetStatus: (open: boolean) => void;
    onShowMeetingInfo: (m: Meeting) => void;
}

function QueueEditor(props: QueueEditorProps) {
    const lastHost = props.queue.hosts.length === 1;
    const hosts = props.queue.hosts.map(h =>
        <li className="list-group-item" key={h.id}>
            <HostEditor host={h} onRemove={props.onRemoveHost} disabled={props.disabled || lastHost}/>
        </li>
    );
    const meetings = props.queue.meeting_set.map(m =>
        <MeetingEditor key={m.id} meeting={m} onRemove={props.onRemoveMeeting} disabled={props.disabled} onShowMeetingInfo={props.onShowMeetingInfo}/>
    );
    const absoluteUrl = `${location.origin}/queue/${props.queue.id}`;
    const toggleStatus = (e: ChangeEvent<HTMLInputElement>) => {
        console.log("ToggleStatus")
        props.onSetStatus(e.target.checked);
    }
    return (
        <div>
            <div className="float-right">
                <button onClick={props.onRemoveQueue} disabled={props.disabled} className="btn btn-danger">
                    Delete Queue
                </button>
            </div>
            <h1 className="form-inline">
                <span className="mr-2">Manage: </span>
                <EditToggleField text={props.queue.name} disabled={props.disabled} id="name"
                    onSubmit={props.onChangeName} buttonType="success" placeholder="New name...">
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
                            onSubmit={props.onChangeDescription} buttonType="success" placeholder="New description...">
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
                            onSubmit={props.onAddHost}
                            disabled={props.disabled}>
                                + Add Host
                        </SingleInputForm>
                    </div>
                </div>
            </div>
            <h3>Meetings Up Next</h3>
            <div className="row">
                <div className="col-md-12">
                    <Table bordered>
                        <thead>
                            <tr>
                                <th>Attendee</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {meetings}
                        </tbody>
                    </Table>
                </div>
            </div>
            <div className="row">
                <div className="col-md-4">
                    <SingleInputForm
                        id="add_attendee"
                        placeholder="Uniqname..."
                        buttonType="success"
                        onSubmit={props.onAddMeeting}
                        disabled={props.disabled}>
                            + Add Attendee
                    </SingleInputForm>
                </div>
            </div>
        </div>
    );
}

interface BlueJeansMeetingInfo {
    metadata: BluejeansMetadata;
}

const BlueJeansMeetingInfo = (props: BlueJeansMeetingInfo) => {
    const meetingNumber = props.metadata.numeric_meeting_id;
    const phoneLinkUsa = <BlueJeansOneTouchDialLink phone="1.312.216.0325" meetingNumber={meetingNumber} />
    const phoneLinkCanada = <BlueJeansOneTouchDialLink phone="1.416.900.2956" meetingNumber={meetingNumber} />
    return (
        <>
        <p>
            This meeting will be via <strong>BlueJeans</strong>.
        </p>
        <p>
            Having problems with video? As a back-up, you can call {phoneLinkUsa} from the USA (or {phoneLinkCanada} from Canada) from any phone and enter {meetingNumber}#, 
            or <a href="https://www.bluejeans.com/numbers">dial in from another country</a>.
        </p>
        </>
    );
}

interface MeetingInfoProps {
    meeting?: Meeting;  // Hide if undefined
    onClose: () => void;
}

const MeetingInfoDialog = (props: MeetingInfoProps) => {
    const generalInfo = props.meeting
        && (
            <>
            <p>
                Attendees: {props.meeting.attendees.map(a => <UserDisplay user={a}/>)}
            </p>
            <p>
                Joined the line at: <DateTimeDisplay dateTime={props.meeting.created_at}/>
            </p>
            </>
        );
    const metadataInfo = props.meeting?.backend_type === "bluejeans"
        ? <BlueJeansMeetingInfo metadata={props.meeting!.backend_metadata!} />
        : <div></div>
    return (
        <Modal show={!!props.meeting} onHide={props.onClose}>
            <Modal.Header closeButton>
                <Modal.Title>Meeting Info</Modal.Title>
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

const recordQueueManagementEvent = (action: string) => {
    ReactGA.event({
        category: "Queue Management",
        action,
    });
}

const showConfirmation = (dialog: React.RefObject<Dialog>, interactions: Subject<boolean>, action: () => void, title: string, actionDescription: string) => {
    interactions.next(true);
    dialog.current!.show({
        title: title,
        body: `Are you sure you want to ${actionDescription}?`,
        actions: [
            Dialog.CancelAction(),
            Dialog.OKAction(action),
        ],
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

    //Setup basic state
    const [queue, setQueue] = useState(undefined as ManageQueue | undefined);
    const [doRefresh, refreshLoading, refreshError] = usePromise(() => api.getQueue(queueIdParsed) as Promise<ManageQueue>, setQueue);
    useEffect(() => {
        doRefresh();
    }, []);
    const [interactions] = useAutoRefresh(doRefresh);
    const [users, setUsers] = useState(undefined as User[] | undefined);
    const [doRefreshUsers, refreshUsersLoading, refreshUsersError] = usePromise(() => api.getUsers(), setUsers);
    useEffect(() => {
        doRefreshUsers();
    }, []);
    useAutoRefresh(doRefreshUsers, 6000);
    const [visibleMeetingDialog, setVisibleMeetingDialog] = useState(undefined as Meeting | undefined);

    //Setup interactions
    const removeHost = async (h: User) => {
        interactions.next(true);
        recordQueueManagementEvent("Removed Host");
        await api.removeHost(queue!.id, h.id);
        await doRefresh();
    }
    const [doRemoveHost, removeHostLoading, removeHostError] = usePromise(removeHost);
    const confirmRemoveHost = (h: User) => {
        showConfirmation(dialogRef, interactions, () => doRemoveHost(h), "Remove Host?", `remove host ${h.username}`);
    }
    const addHost = async (uniqname: string) => {
        interactions.next(true);
        uniqname = sanitizeUniqname(uniqname);
        validateUniqname(uniqname);
        const user = users!.find(u => u.username === uniqname);
        if (!user) throw new Error(invalidUniqnameMessage(uniqname));
        recordQueueManagementEvent("Added Host");
        await api.addHost(queue!.id, user.id);
        await doRefresh();
    }
    const [doAddHost, addHostLoading, addHostError] = usePromise(addHost);
    const removeMeeting = async (m: Meeting) => {
        interactions.next(true);
        recordQueueManagementEvent("Removed Meeting");
        await api.removeMeeting(m.id);
        await doRefresh();
    }
    const [doRemoveMeeting, removeMeetingLoading, removeMeetingError] = usePromise(removeMeeting);
    const confirmRemoveMeeting = (m: Meeting) => {
        showConfirmation(dialogRef, interactions, () => doRemoveMeeting(m), "Remove Meeting?", `remove your meeting with ${m.attendees[0].first_name} ${m.attendees[0].last_name}`);
    }
    const addMeeting = async (uniqname: string) => {
        interactions.next(true);
        uniqname = sanitizeUniqname(uniqname);
        validateUniqname(uniqname);
        const user = users!.find(u => u.username === uniqname);
        if (!user) throw new Error(invalidUniqnameMessage(uniqname));
        recordQueueManagementEvent("Added Meeting");
        await api.addMeeting(queue!.id, user.id);
        await doRefresh();
    }
    const [doAddMeeting, addMeetingLoading, addMeetingError] = usePromise(addMeeting);
    const changeName = async (name: string) => {
        interactions.next(true);
        recordQueueManagementEvent("Changed Name");
        return await api.changeQueueName(queue!.id, name);
    }
    const [doChangeName, changeNameLoading, changeNameError] = usePromise(changeName, setQueue);
    const changeDescription = async (description: string) => {
        interactions.next(true);
        recordQueueManagementEvent("Changed Description");
        return await api.changeQueueDescription(queue!.id, description);
    }
    const [doChangeDescription, changeDescriptionLoading, changeDescriptionError] = usePromise(changeDescription, setQueue);
    const removeQueue = async () => {
        interactions.next(true);
        recordQueueManagementEvent("Removed Host");
        await api.deleteQueue(queue!.id);
        location.href = '/manage';
    }
    const [doRemoveQueue, removeQueueLoading, removeQueueError] = usePromise(removeQueue);
    const confirmRemoveQueue = () => {
        showConfirmation(dialogRef, interactions, () => doRemoveQueue(), "Delete Queue?", "permanently delete this queue");
    }
    const setStatus = async (open: boolean) => {
        interactions.next(true);
        recordQueueManagementEvent("Set Open/Close: " + open);
        return await api.setStatus(queue!.id, open);
    }
    const [doSetStatus, setStatusLoading, setStatusError] = usePromise(setStatus, setQueue);

    //Render
    const isChanging = removeHostLoading || addHostLoading || removeMeetingLoading || addMeetingLoading || changeNameLoading || changeDescriptionLoading || removeQueueLoading || setStatusLoading;
    const isLoading = refreshLoading || refreshUsersLoading || isChanging;
    const errorTypes = [refreshError, refreshUsersError, removeHostError, addHostError, removeMeetingError, addMeetingError, changeNameError, changeDescriptionError, removeQueueError, setStatusError];
    const error = errorTypes.find(e => e);
    const loginDialogVisible = errorTypes.some(e => e?.name === "ForbiddenError");
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay error={error}/>
    const queueEditor = queue
        && <QueueEditor queue={queue} disabled={isChanging}
            onAddHost={doAddHost} onRemoveHost={confirmRemoveHost} 
            onAddMeeting={doAddMeeting} onRemoveMeeting={confirmRemoveMeeting} 
            onChangeName={doChangeName} onChangeDescription={doChangeDescription}
            onSetStatus={doSetStatus} onRemoveQueue={confirmRemoveQueue}
            onShowMeetingInfo={setVisibleMeetingDialog}/>
    return (
        <>
        <Dialog ref={dialogRef}/>
        <LoginDialog visible={loginDialogVisible}/>
        <MeetingInfoDialog meeting={visibleMeetingDialog} onClose={() => setVisibleMeetingDialog(undefined)}/>
        {loadingDisplay}
        {errorDisplay}
        {queueEditor}
        </>
    );
}

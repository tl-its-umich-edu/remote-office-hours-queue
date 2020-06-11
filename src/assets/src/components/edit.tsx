import * as React from "react";
import { useState, useEffect, createRef, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import * as ReactGA from "react-ga";
import Dialog from "react-bootstrap-dialog";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Alert from "react-bootstrap/Alert";
import PhoneInput from "react-phone-input-2";
import 'react-phone-input-2/lib/style.css'

import * as api from "../services/api";
import { User, QueueHost, Meeting, BluejeansMetadata } from "../models";
import { UserDisplay, RemoveButton, ErrorDisplay, LoadingDisplay, SingleInputForm, invalidUniqnameMessage, DateDisplay, CopyField, EditToggleField, LoginDialog, BlueJeansOneTouchDialLink, Breadcrumbs, DateTimeDisplay } from "./common";
import { usePromise } from "../hooks/usePromise";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { redirectToLogin, sanitizeUniqname, validateUniqname } from "../utils";
import { PageProps } from "./page";
import { Subject } from "rxjs";

interface MeetingEditorProps {
    meeting: Meeting;
    disabled: boolean;
    potentialAssignees: User[];
    user: User;
    onRemove: (m: Meeting) => void;
    onShowMeetingInfo: (m: Meeting) => void;
    onChangeAssignee: (a: User | undefined) => void;
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
    const assigneeOptions = [<option value="">Assign to Host...</option>]
        .concat(
            props.potentialAssignees
                .sort((a, b) => a.id === props.user.id ? -1 : b.id === props.user.id ? 1 : 0)
                .map(a => <option value={a.id}>{a.first_name} {a.last_name} ({a.username})</option>)
        );
    const onChangeAssignee = (e: React.ChangeEvent<HTMLSelectElement>) =>
        e.target.value === ""
            ? props.onChangeAssignee(undefined)
            : props.onChangeAssignee(props.potentialAssignees.find(a => a.id === +e.target.value));
    return (
        <>
        <td>
            <UserDisplay user={user}/>
        </td>
        <td className="form-group">
            <select className="form-control"
                value={props.meeting.assignee?.id ?? ""} 
                onChange={onChangeAssignee}>
                {assigneeOptions}
            </select>
        </td>
        <td>
            {joinLink}
            {infoButton}
            <RemoveButton onRemove={() => props.onRemove(props.meeting)} size="sm" disabled={props.disabled} screenReaderLabel={`Remove Meeting with ${user.first_name} ${user.last_name}`}/>
        </td>
        </>
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
    queue: QueueHost;
    user: User;
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
    onChangeAssignee: (a: User | undefined, m: Meeting) => void;
}

function QueueEditor(props: QueueEditorProps) {
    const lastHost = props.queue.hosts.length === 1;
    const hosts = props.queue.hosts.map(h =>
        <li className="list-group-item" key={h.id}>
            <HostEditor host={h} onRemove={props.onRemoveHost} disabled={props.disabled || lastHost}/>
        </li>
    );
    const meetings = props.queue.meeting_set
        .sort((a, b) => a.id - b.id)
        .map((m, i) =>
            <tr>
                <td>{i+1}</td>
                <MeetingEditor key={m.id} user={props.user} potentialAssignees={props.queue.hosts} meeting={m} disabled={props.disabled}
                    onRemove={props.onRemoveMeeting} onShowMeetingInfo={props.onShowMeetingInfo} onChangeAssignee={(a: User | undefined) => props.onChangeAssignee(a, m) }/>
            </tr>
        );
    const meetingsTable = props.queue.meeting_set.length
        ? (
            <Table bordered>
                <thead>
                    <tr>
                        <th>Queue #</th>
                        <th>Attendee</th>
                        <th>Host</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {meetings}
                </tbody>
            </Table>
        )
        : (
            <Alert variant="dark">No meetings in queue.</Alert>
        );
    const absoluteUrl = `${location.origin}/queue/${props.queue.id}`;
    const toggleStatus = (e: ChangeEvent<HTMLInputElement>) => {
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
                    {meetingsTable}
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
    const attendeeDetails = props.meeting?.attendees.map(a => 
        <p>
            <UserDisplay user={a}/>
            <strong>  Phone:</strong><PhoneInput value={a.phone_number} disabled={true}/>
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
            </>
        );
    const metadataInfo = props.meeting?.backend_type === "bluejeans"
        ? <BlueJeansMeetingInfo metadata={props.meeting!.backend_metadata!} />
        : <div></div>
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
        redirectToLogin(props.loginUrl);
    }
    const queue_id = props.match.params.queue_id;
    if (queue_id === undefined) throw new Error("queue_id is undefined!");
    if (!props.user) throw new Error("user is undefined!");
    const dialogRef = createRef<Dialog>();
    const queueIdParsed = parseInt(queue_id);

    //Setup basic state
    const [queue, setQueue] = useState(undefined as QueueHost | undefined);
    const [doRefresh, refreshLoading, refreshError] = usePromise(() => api.getQueue(queueIdParsed) as Promise<QueueHost>, setQueue);
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
    const changeAssignee = async (assignee: User | undefined, meeting: Meeting) => {
        console.log("assignee")
        console.log(assignee)
        console.log("meeting")
        console.log(meeting)
        interactions.next(true);
        recordQueueManagementEvent("Changed Assignee");
        await api.changeMeetingAssignee(meeting.id, assignee?.id);
        await doRefresh();
    }
    const [doChangeAssignee, changeAssigneeLoading, changeAssigneeError] = usePromise(changeAssignee);

    //Render
    const isChanging = removeHostLoading || addHostLoading || removeMeetingLoading || addMeetingLoading || changeNameLoading || changeDescriptionLoading || removeQueueLoading || setStatusLoading || changeAssigneeLoading;
    const isLoading = refreshLoading || refreshUsersLoading || isChanging;
    const errorTypes = [refreshError, refreshUsersError, removeHostError, addHostError, removeMeetingError, addMeetingError, changeNameError, changeDescriptionError, removeQueueError, setStatusError, changeAssigneeError];
    const error = errorTypes.find(e => e);
    const loginDialogVisible = errorTypes.some(e => e?.name === "ForbiddenError");
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay error={error}/>
    const queueEditor = queue
        && <QueueEditor queue={queue} disabled={isChanging} user={props.user!}
            onAddHost={doAddHost} onRemoveHost={confirmRemoveHost} 
            onAddMeeting={doAddMeeting} onRemoveMeeting={confirmRemoveMeeting} 
            onChangeName={doChangeName} onChangeDescription={doChangeDescription}
            onSetStatus={doSetStatus} onRemoveQueue={confirmRemoveQueue}
            onShowMeetingInfo={setVisibleMeetingDialog} onChangeAssignee={doChangeAssignee}/>
    return (
        <>
        <Dialog ref={dialogRef}/>
        <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
        <MeetingInfoDialog
            meeting={visibleMeetingDialog}
            onClose={() => setVisibleMeetingDialog(undefined)} />
        <Breadcrumbs
            currentPageTitle={queue?.name ?? queueIdParsed.toString()}
            intermediatePages={[{title: "Manage", href: "/manage"}]} />
        {loadingDisplay}
        {errorDisplay}
        {queueEditor}
        </>
    );
}

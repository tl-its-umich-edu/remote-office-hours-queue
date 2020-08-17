import * as React from "react";
import { useState, createRef, ChangeEvent, useEffect } from "react";
import { Link } from "react-router-dom";
import * as ReactGA from "react-ga";
import { Modal, Button, Table, Alert, Form } from "react-bootstrap";
import Dialog from "react-bootstrap-dialog";
import PhoneInput from "react-phone-input-2";
import 'react-phone-input-2/lib/style.css'

import * as api from "../services/api";
import { User, QueueHost, Meeting, BluejeansMetadata, isQueueHost, QueueAttendee } from "../models";
import { UserDisplay, RemoveButton, ErrorDisplay, FormError, checkForbiddenError, LoadingDisplay, SingleInputForm, invalidUniqnameMessage, DateDisplay, CopyField, EditToggleField, LoginDialog, Breadcrumbs, DateTimeDisplay, BlueJeansDialInMessage, ShowRemainingField, BackendSelector as MeetingBackendSelector, DropdownValue } from "./common";
import { usePromise } from "../hooks/usePromise";
import { redirectToLogin, sanitizeUniqname, validateUniqname, redirectToSearch } from "../utils";
import { PageProps } from "./page";
import { useQueueWebSocket, useUsersWebSocket } from "../services/sockets";

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
        <td>
            <UserDisplay user={user}/>
        </td>
        <td className="form-group">
            <select className="form-control assign"
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

interface AddAttendeeFormProps {
    allowedBackends: Set<string>;
    backends: {[backend_type: string]: string};
    defaultBackend: string;
    disabled: boolean;
    onSubmit: (value: string, backend: string) => void;
}

function AddAttendeeForm(props: AddAttendeeFormProps) {
    const [attendee, setAttendee] = useState("");
    const [selectedBackend, setSelectedBackend] = useState(
        props.allowedBackends.has(props.defaultBackend)
            ? props.defaultBackend
            : Array.from(props.allowedBackends)[0]
    );
    const inputRef = createRef<HTMLInputElement>();
    useEffect(() => {
        inputRef.current!.focus();
    }, []);
    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        props.onSubmit(attendee, selectedBackend);
        setAttendee("");
    }
    const options = Array.from(props.allowedBackends)
        .map((b) => ({value: b, displayValue: props.backends[b]} as DropdownValue));
    return (
        <form onSubmit={submit} className="input-group">
            <input onChange={(e) => setAttendee(e.target.value)} value={attendee}
                ref={inputRef} type="text" className="form-control" placeholder="Uniqname..."
                disabled={props.disabled} id="add_attendee" />
            <div className="input-group-append">
                <MeetingBackendSelector options={options}
                    onChange={setSelectedBackend} selectedBackend={selectedBackend}/>
            </div>
            <div className="input-group-append">
                <button className="btn btn-success" type="submit" disabled={props.disabled}>
                    + Add Attendee
                </button>
            </div>
        </form>
    );
}

interface AllowedMeetingBackendsFormProps {
    queue: QueueHost;
    backends: {[backend_type: string]: string};
    allowed: Set<string>;
    onChange: (allowedBackends: Set<string>) => void;
    disabled: boolean;
}

function AllowedBackendsForm(props: AllowedMeetingBackendsFormProps) {
    const toggleAllowed = (backend_type: string) => {
        const newAllowed = new Set(props.allowed);
        if (newAllowed.has(backend_type)) {
            newAllowed.delete(backend_type);
        } else {
            newAllowed.add(backend_type);
        }
        props.onChange(newAllowed);
    }
    const allowedMeetingTypeEditors = Object.keys(props.backends)
        .map((b) =>
            <Form.Group key={b} controlId={b}>
                <Form.Check type="checkbox" label={props.backends[b]}
                    checked={props.allowed.has(b)}
                    onChange={() => toggleAllowed(b)}/>
            </Form.Group>
        );
    return (
        <Form>
            {allowedMeetingTypeEditors}
        </Form>
    );
}

interface QueueEditorProps {
    queue: QueueHost;
    user: User;
    disabled: boolean;
    backends: {[backend_type: string]: string};
    defaultBackend: string;
    onAddMeeting: (uniqname: string, backend: string) => void;
    onRemoveMeeting: (m: Meeting) => void;
    onAddHost: (uniqname: string) => void;
    onRemoveHost: (h: User) => void;
    onChangeName: (name: string) => void;
    onChangeDescription: (description: string) => void;
    onRemoveQueue: () => void;
    onSetStatus: (open: boolean) => void;
    onShowMeetingInfo: (m: Meeting) => void;
    onChangeAssignee: (a: User | undefined, m: Meeting) => void;
    onUpdateAllowedBackends: (allowedBackends: Set<string>) => void;
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
            <tr key={m.id}>
                <th scope="row" className="d-none d-sm-table-cell">{i+1}</th>
                <MeetingEditor key={m.id} user={props.user} potentialAssignees={props.queue.hosts} meeting={m} disabled={props.disabled} backends={props.backends}
                    onRemove={props.onRemoveMeeting} onShowMeetingInfo={props.onShowMeetingInfo} onChangeAssignee={(a: User | undefined) => props.onChangeAssignee(a, m) }/>
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
                        <th scope="col">Actions</th>
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
    const toggleStatus = (e: ChangeEvent<HTMLSelectElement>) => {
        props.onSetStatus(e.target.value === "open");
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
                    onSubmit={props.onChangeName} buttonType="success" placeholder="New name..." initialState={false}>
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
                    <label htmlFor="status" className="col-md-2 col-form-label">Queue Status:</label>
                    <div className="col-md-6">
                        <select className="form-control" id="status" onChange={toggleStatus} value={props.queue.status}>
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </div>
                <div className="form-group row">
                    <label htmlFor="allowed meeting types" className="col-md-2 col-form-label">Allowed Meeting Types:</label>
                    <div className="col-md-6">
                        <AllowedBackendsForm 
                            queue={props.queue}
                            allowed={new Set(props.queue.allowed_backends)}
                            onChange={props.onUpdateAllowedBackends}
                            disabled={props.disabled}
                            backends={props.backends}/>
                    </div>
                </div>
                <div className="form-group row">
                    <label htmlFor="description" className="col-md-2 col-form-label">Description:</label>
                    <div className="col-md-6">
                        <ShowRemainingField text={props.queue.description} disabled={props.disabled} id="description"
                            onSubmit={props.onChangeDescription} buttonType="success" placeholder="New description..."
                            initialState={false} maxLength={1000}>
                                Change
                        </ShowRemainingField>
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
                    <div className="table-responsive">
                        {meetingsTable}
                    </div>
                </div>
            </div>
            <div className="row">
                <div className="col-md-8">
                    <AddAttendeeForm allowedBackends={new Set(props.queue.allowed_backends)} backends={props.backends}
                        defaultBackend={props.defaultBackend} disabled={props.disabled}
                        onSubmit={props.onAddMeeting}/>
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

const recordQueueManagementEvent = (action: string) => {
    ReactGA.event({
        category: "Queue Management",
        action,
    });
}

const showConfirmation = (dialog: React.RefObject<Dialog>, action: () => void, title: string, actionDescription: string) => {
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
    const [users, setUsers] = useState(undefined as User[] | undefined);
    const usersWebSocketError = useUsersWebSocket(setUsers)
    const [visibleMeetingDialog, setVisibleMeetingDialog] = useState(undefined as Meeting | undefined);

    //Setup interactions
    const removeHost = async (h: User) => {
        recordQueueManagementEvent("Removed Host");
        await api.removeHost(queue!.id, h.id);
    }
    const [doRemoveHost, removeHostLoading, removeHostError] = usePromise(removeHost);
    const confirmRemoveHost = (h: User) => {
        showConfirmation(dialogRef, () => doRemoveHost(h), "Remove Host?", `remove host ${h.username}`);
    }
    const addHost = async (uniqname: string) => {
        uniqname = sanitizeUniqname(uniqname);
        validateUniqname(uniqname);
        const user = users!.find(u => u.username === uniqname);
        if (!user) throw new Error(invalidUniqnameMessage(uniqname));
        recordQueueManagementEvent("Added Host");
        await api.addHost(queue!.id, user.id);
    }
    const [doAddHost, addHostLoading, addHostError] = usePromise(addHost);
    const removeMeeting = async (m: Meeting) => {
        recordQueueManagementEvent("Removed Meeting");
        await api.removeMeeting(m.id);
    }
    const [doRemoveMeeting, removeMeetingLoading, removeMeetingError] = usePromise(removeMeeting);
    const confirmRemoveMeeting = (m: Meeting) => {
        showConfirmation(dialogRef, () => doRemoveMeeting(m), "Remove Meeting?", `remove your meeting with ${m.attendees[0].first_name} ${m.attendees[0].last_name}`);
    }
    const addMeeting = async (uniqname: string, backend: string) => {
        uniqname = sanitizeUniqname(uniqname);
        validateUniqname(uniqname);
        const user = users!.find(u => u.username === uniqname);
        if (!user) throw new Error(invalidUniqnameMessage(uniqname));
        recordQueueManagementEvent("Added Meeting");
        await api.addMeeting(queue!.id, user.id, backend);
    }
    const [doAddMeeting, addMeetingLoading, addMeetingError] = usePromise(addMeeting);
    const changeName = async (name: string) => {
        recordQueueManagementEvent("Changed Name");
        return await api.changeQueueName(queue!.id, name);
    }
    const [doChangeName, changeNameLoading, changeNameError] = usePromise(changeName, setQueueChecked);
    const changeDescription = async (description: string) => {
        recordQueueManagementEvent("Changed Description");
        return await api.changeQueueDescription(queue!.id, description);
    }
    const [doChangeDescription, changeDescriptionLoading, changeDescriptionError] = usePromise(changeDescription, setQueueChecked);
    const removeQueue = async () => {
        recordQueueManagementEvent("Removed Host");
        await api.deleteQueue(queue!.id);
        location.href = '/manage';
    }
    const [doRemoveQueue, removeQueueLoading, removeQueueError] = usePromise(removeQueue);
    const confirmRemoveQueue = () => {
        showConfirmation(dialogRef, () => doRemoveQueue(), "Delete Queue?", "permanently delete this queue");
    }
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
    const updateAllowedBackends = async (allowedBackends: Set<string>) => {
        if (allowedBackends.size === 0) {    
            throw new Error("Must have at least one allowed meeting type.");
        }
        const meetingsWithDisallowedBackends = queue!.meeting_set.filter(m => !allowedBackends.has(m.backend_type));
        if (meetingsWithDisallowedBackends.length) {
            const meetingsList = meetingsWithDisallowedBackends
                .map(m => m.attendees[0])
                .map(u => `${u.first_name} ${u.last_name} (${u.username})`)
                .reduce((p, c) => p + ', ' + c);
            throw new Error(`You can't disallow this meeting type until the following meetings that use it have been removed from the queue: ${meetingsList}`);
        }
        await api.updateAllowedMeetingTypes(queue!.id, allowedBackends);
    }
    const [doUpdateAllowedBackends, updateAllowedMeetingTypesLoading, updateAllowedMeetingTypesError] = usePromise(updateAllowedBackends);
    
    //Render
    const isChanging = removeHostLoading || addHostLoading || removeMeetingLoading || addMeetingLoading || changeNameLoading || changeDescriptionLoading || removeQueueLoading || setStatusLoading || changeAssigneeLoading || updateAllowedMeetingTypesLoading;
    const errorSources = [
        {source: 'Access Denied', error: authError},
        {source: 'Queue Connection', error: queueWebSocketError},
        {source: 'Users Connection', error: usersWebSocketError}, 
        {source: 'Remove Host', error: removeHostError}, 
        {source: 'Add Host', error: addHostError}, 
        {source: 'Remove Meeting', error: removeMeetingError}, 
        {source: 'Add Meeting', error: addMeetingError}, 
        {source: 'Queue Name', error: changeNameError}, 
        {source: 'Queue Description', error: changeDescriptionError}, 
        {source: 'Delete Queue', error: removeQueueError}, 
        {source: 'Queue Status', error: setStatusError}, 
        {source: 'Assignee', error: changeAssigneeError},
        {source: 'Allowed Meeting Types', error: updateAllowedMeetingTypesError}
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = errorSources.some(checkForbiddenError);
    const loadingDisplay = <LoadingDisplay loading={isChanging}/>
    const errorDisplay = <ErrorDisplay formErrors={errorSources}/>
    const queueEditor = queue
        && <QueueEditor queue={queue}  disabled={isChanging} user={props.user!}
            backends={props.backends} defaultBackend={props.defaultBackend}
            onAddHost={doAddHost} onRemoveHost={confirmRemoveHost} 
            onAddMeeting={doAddMeeting} onRemoveMeeting={confirmRemoveMeeting} 
            onChangeName={doChangeName} onChangeDescription={doChangeDescription}
            onSetStatus={doSetStatus} onRemoveQueue={confirmRemoveQueue}
            onShowMeetingInfo={setVisibleMeetingDialog} onChangeAssignee={doChangeAssignee}
            onUpdateAllowedBackends={doUpdateAllowedBackends}/>
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

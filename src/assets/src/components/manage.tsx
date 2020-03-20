import * as React from "react";
import { useState, useEffect } from "react";
import { getQueuesFake, removeMeetingFake, addMeetingFake, removeHostFake, addHostFake } from "../services/api";
import { User, Queue, Meeting, Host } from "../models";
import { UserDisplay, RemoveButton, AddButton } from "./common";

interface MeetingEditorProps {
    meeting: Meeting;
    remove: () => void;
}

function MeetingEditor(props: MeetingEditorProps) {
    const user = props.meeting.attendees[0]!.user;
    return (
        <dd>
            <UserDisplay user={user}/>
            <span className="float-right">
                <RemoveButton remove={props.remove}/>
            </span>
        </dd>
    );
}

interface HostEditorProps {
    host: Host;
    remove?: () => void;
}

function HostEditor(props: HostEditorProps) {
    const removeButton = props.remove
        ? <RemoveButton remove={props.remove}/>
        : undefined;
    return (
        <span>
            <UserDisplay user={props.host.user}/>
            {removeButton}
        </span>
    );
}

interface QueueEditorProps {
    queue: Queue;
    refresh: () => void;
}

function QueueEditor(props: QueueEditorProps) {
    const removeHost = (h: Host) => {
        removeHostFake(props.queue.id, h.id);
        props.refresh();
    }
    const hosts = props.queue.hosts.map(h =>
        <dd>
            <HostEditor host={h} remove={() => removeHost(h)}/>
        </dd>
    );
    const addHost = () => {
        const uniqname = prompt("Uniqname?", "aaaaaaaa");
        if (!uniqname) return;
        addHostFake(props.queue.id, uniqname);
        props.refresh();
    }
    const removeMeeting = (m: Meeting) => {
        removeMeetingFake(props.queue.id, m.id);
        props.refresh();
    }
    const meetings = props.queue.meetings.map(m =>
        <li className="list-group-item">
            <MeetingEditor meeting={m} remove={() => removeMeeting(m)}/>
        </li>
    );
    const addMeeting = () => {
        const uniqname = prompt("Uniqname?", "johndoe");
        if (!uniqname) return;
        addMeetingFake(props.queue.id, uniqname);
        props.refresh();
    }
    return (
        <div>
            <dl>
                <dt>ID</dt>
                <dd>{props.queue.id}</dd>
                <dt>Name</dt>
                <dd>{props.queue.name}</dd>
                <dt>Created At</dt>
                <dd>{props.queue.created_at}</dd>
                <dt>Hosted By</dt>
                {hosts}
                <AddButton add={() => addHost()}> Add Host</AddButton>
            </dl>
            <h3>Queued Meetings</h3>
            <ol className="list-group">
                {meetings}
            </ol>
            <AddButton add={() => addMeeting()}> Force Add Attendee</AddButton>
        </div>
    );
}

interface QueueListProps {
    queues: Queue[];
    refresh: () => void;
}

function QueueList(props: QueueListProps) {
    const queues = props.queues.map((q) => 
        <li><QueueEditor key={q.id} queue={q} refresh={props.refresh}/></li>
    );
    return (
        <ul>{queues}</ul>
    );
}

interface ManageProps {
    user?: User;
}

export function Manage(props: ManageProps) {
    const [queues, setQueue] = useState(undefined as Queue[] | undefined);
    const [isLoading, setIsLoading] = useState(true);
    const refresh = () => {
        setIsLoading(true);
        getQueuesFake()
            .then((data) => {
                setQueue(data);
                setIsLoading(false);
            })
            .catch((error) => {
                throw new Error(error);
            });
    }
    useEffect(() => {
        refresh();
    }, [queues]);
    const queueList = queues !== undefined
        ? <QueueList queues={queues} refresh={refresh} />
        : <span>Loading...</span>;
    return (
        <div>{queueList}</div>
    );
}

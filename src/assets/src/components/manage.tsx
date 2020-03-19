import * as React from "react";
import { useState, useEffect } from "react";
import { getQueuesFake, removeMeetingFake, addMeetingFake } from "../services/api";
import { User, Queue, Meeting } from "../models";

interface MeetingDetailsProps {
    meeting: Meeting;
    remove: () => void;
}

function MeetingDetails(props: MeetingDetailsProps) {
    const user = props.meeting.attendees[0]!.user;
    const removeButton = (
        <button onClick={() => props.remove()} className="btn btn-danger">X</button>
    );
    return (
        <dd>
            {props.meeting.id}: {user.username}
            {removeButton}
        </dd>
    )
}

interface QueueDetailsProps {
    queue: Queue;
    refresh: () => void;
}

function QueueDetails(props: QueueDetailsProps) {
    const hosts = props.queue.hosts.map(h =>
        <dd>{h.user.username}</dd>
    );
    const removeMeeting = (m: Meeting) => {
        removeMeetingFake(props.queue.id, m.id);
        props.refresh();
    }
    const meetings = props.queue.meetings.map(m =>
        <MeetingDetails meeting={m} remove={() => removeMeeting(m)} />
    );
    const addMeeting = () => {
        const uniqname = prompt("Uniqname?", "johndoe");
        if (!uniqname) return;
        addMeetingFake(props.queue.id, uniqname);
        props.refresh();
    }
    const addButton = (
        <button onClick={() => addMeeting()} className="btn btn-success">
            +
        </button>
    )
    return (
        <dl>
            <dt>ID</dt>
            <dd>{props.queue.id}</dd>
            <dt>Name</dt>
            <dd>{props.queue.name}</dd>
            <dt>Created At</dt>
            <dd>{props.queue.created_at}</dd>
            <dt>Hosted By</dt>
            {hosts}
            <dt>Meetings</dt>
            {meetings}
            {addButton}
        </dl>
    )
}

interface QueueListProps {
    queues: Queue[];
    refresh: () => void;
}

function QueueList(props: QueueListProps) {
    const queues = props.queues.map((q) => 
        <li><QueueDetails key={q.id} queue={q} refresh={props.refresh}/></li>
    )
    return (
        <ul>{queues}</ul>
    )
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
    )
}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Col, Form, Row, Table } from "react-bootstrap";

import { UserDisplay, RemoveButton } from "./common";
import { getBackendByName } from "./meetingType";
import { Meeting, MeetingBackend, QueueHost, User } from "../models";


interface MeetingEditorComponentProps {
    meeting: Meeting;
    disabled: boolean;
}

interface MeetingDetailsProps extends MeetingEditorComponentProps {
    readableMeetingType: string;
    onShowMeetingInfo: (m: Meeting) => void;
}

const MeetingDetails = (props: MeetingDetailsProps) => {
    return (
        <Row>
            <Col md={6} className='mb-1'>
                <Badge bg='secondary' aria-label='Meeting Type'>{props.readableMeetingType}</Badge>
            </Col>
            <Col md={6}>
                <Button
                    variant='link'
                    size='sm'
                    onClick={() => props.onShowMeetingInfo(props.meeting)}
                    disabled={props.disabled}
                >
                    Join Info
                </Button>
            </Col>
        </Row>
    );
}

interface AssigneeSelectorProps extends MeetingEditorComponentProps {
    user: User;
    potentialAssignees: User[];
    onChangeAssignee: (a: User | undefined) => void;
}

const AssigneeSelector = (props: AssigneeSelectorProps) => {
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
        <div className='form-group'>
            <Form.Select className="assign"
                value={props.meeting.assignee?.id ?? ""}
                onChange={onChangeAssignee}
                disabled={props.disabled}
            >
                {assigneeOptions}
            </Form.Select>
        </div>
    )
}


interface MeetingEditorProps extends MeetingDetailsProps {
    user: User;
    readableMeetingType: string;
    onRemoveMeeting: (m: Meeting) => void;
}

interface UnstartedMeetingEditorProps extends MeetingEditorProps, AssigneeSelectorProps {
    onStartMeeting: (m: Meeting) => void;
}

const InvalidMeeting = (props: MeetingEditorProps) => {
    return (
<>
        <td>No attendee</td>
        <td></td>
        <td>Invalid meeting ID: {props.meeting.id}. Please remove this meeting.</td>
        <td>
            <RemoveButton
                onRemove={() => props.onRemoveMeeting(props.meeting)}
                size="sm"
                screenReaderLabel={`Remove Meeting ${props.meeting.id} with no attendee`}
                disabled={props.disabled}
            />
        </td>
        </>
    );

}

// format the value and unit into a string,
// with the unit pluralized if the value is greater than 1
function formatUnit(value: number, unit: string): string {
    return `${value} ${unit}${value > 1 ? 's' : ''}`;
}

// format the time in seconds to hours, minutes, and seconds
function formatTimeInSeconds(timeInSeconds: number): string {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;

    return `${formatUnit(hours, 'hour')} ${formatUnit(minutes, 'minute')} ${formatUnit(seconds, 'second')}`;
}

function UnstartedMeetingEditor (props: UnstartedMeetingEditorProps) {
    const attendee = props.meeting.attendees[0] ?? null;
    if (!attendee) return <InvalidMeeting {...props} />;

    const attendeeString = `${attendee.first_name} ${attendee.last_name}`;
    const assignee = props.meeting.assignee;

    const removeButton = (
        <RemoveButton
            onRemove={() => props.onRemoveMeeting(props.meeting)}
            size="sm"
            screenReaderLabel={`Remove Meeting with ${attendeeString}`}
            disabled={props.disabled}
        />
    );

    const meetingActions = assignee?.id === props.user.id
        ? (
            <>
            <Col lg={7} className='mb-1'>
                <Button
                    variant='success'
                    size='sm'
                    onClick={() => props.onStartMeeting(props.meeting)}
                    aria-label={`${props.meeting.backend_type === 'inperson' ? 'Ready for Attendee' : 'Create Meeting with'} ${attendeeString}`}
                    disabled={props.disabled}
                >
                    {props.meeting.backend_type === 'inperson' ? 'Ready for Attendee' : 'Create Meeting'}
                </Button>
            </Col>
            <Col lg={5}>{removeButton}</Col>
            </>
        )
        : assignee
            ? <Col><span>Only the assigned host can use meeting actions.</span></Col>
            : (
                <>
                <Col lg={7} className='mb-1'><span>Please assign host.</span></Col>
                <Col lg={5}>{removeButton}</Col>
                </>
            );

        // calculate the time different from now to the time user joined the queue
        const [secondsInQueue, setSecondsInQueue] = useState(Math.floor((new Date().getTime() - new Date(props.meeting.created_at).getTime()) / 1000));

        useEffect(() => {
            const intervalId = setInterval(() => {
                setSecondsInQueue(Math.floor((new Date().getTime() - new Date(props.meeting.created_at).getTime()) / 1000));
            }, 5000);

            return () => clearInterval(intervalId);
        }, [props.meeting.created_at]);
    return (
        <>
        <td><UserDisplay user={attendee}/></td>
        <td><AssigneeSelector {...props} /></td>
        <td><MeetingDetails {...props} /></td>
        <td>{formatTimeInSeconds(secondsInQueue)}</td>
        <td><Row>{meetingActions}</Row></td>
        </>
    );
}

function StartedMeetingEditor (props: MeetingEditorProps) {
    const attendee = props.meeting.attendees[0] ?? null;
    if (!attendee) return <InvalidMeeting {...props} />;

    const attendeeString = `${attendee.first_name} ${attendee.last_name}`;
    const isHost = props.user.id === props.meeting.assignee!.id;
    const joinUrl = isHost
        ? props.meeting.backend_metadata?.host_meeting_url || props.meeting.backend_metadata?.meeting_url
        : props.meeting.backend_metadata?.meeting_url;
    const roleText = isHost ? 'Host' : 'Guest';
    const joinLink = joinUrl
        && (
            <Button
                variant='primary'
                size='sm'
                as='a'
                href={joinUrl}
                target="_blank"
                aria-label={`Join Meeting as ${roleText} with ${attendeeString}`}
                disabled={props.disabled}
            >
                Join Meeting as {roleText}
            </Button>
        );

    return (
        <>
        <td><UserDisplay user={attendee}/></td>
        <td><UserDisplay user={props.meeting.assignee!} /></td>
        <td><MeetingDetails {...props} /></td>
        <td>
            <Row>
                {joinLink && <Col lg={6} className='mb-1'>{joinLink}</Col>}
                <Col lg={6}>
                    <RemoveButton
                        onRemove={() => props.onRemoveMeeting(props.meeting)}
                        size="sm"
                        screenReaderLabel={`Remove Meeting with ${attendeeString}`}
                        disabled={props.disabled}
                    />
                </Col>
            </Row>
        </td>
        </>
    );
}


interface MeetingTableProps {
    user: User;
    meetings: Meeting[];
    backends: MeetingBackend[];
    onRemoveMeeting: (m: Meeting) => void;
    onShowMeetingInfo: (m: Meeting) => void;
    disabled: boolean;
}

interface MeetingsInQueueTableProps extends MeetingTableProps {
    queue: QueueHost;
    onChangeAssignee: (a: User | undefined, m: Meeting) => void;
    onStartMeeting: (m: Meeting) => void;
}

export function MeetingsInQueueTable (props: MeetingsInQueueTableProps) {
    const unstartedMeetingRows = props.meetings
        .sort((a, b) => a.id - b.id)
        .map(
            (m, i) => (
                <tr key={m.id}>
                    <th scope="row" className="d-none d-sm-table-cell">{i+1}</th>
                    <UnstartedMeetingEditor
                        {...props}
                        meeting={m}
                        readableMeetingType={getBackendByName(m.backend_type, props.backends).friendly_name}
                        potentialAssignees={props.queue.hosts}
                        onChangeAssignee={(a: User | undefined) => props.onChangeAssignee(a, m)}
                    />
                </tr>
            )
        );

    const unstartedMeetingsTable = props.meetings.length
        ? (
            <Table bordered responsive>
                <thead>
                    <tr>
                        <th scope="col" className="d-none d-sm-table-cell">Queue #</th>
                        <th scope="col">Attendee</th>
                        <th scope="col">Host</th>
                        <th scope="col">Details</th>
                        <th scope="col">Time in Queue</th>
                        <th scope="col">Meeting Actions</th>
                    </tr>
                </thead>
                <tbody>{unstartedMeetingRows}</tbody>
            </Table>
        )
        : (
            <>
            <hr/>
            <p>There are currently no meetings in queue.</p>
            <p>
                <strong>Did you know?</strong> You can get notified by SMS (text) message when someone joins your empty queue
                by adding your cell phone number and enabling host notifications in your <Link to="/preferences">User Preferences</Link>. 
            </p>
            </>
        );
    return unstartedMeetingsTable;
}

export function MeetingsInProgressTable (props: MeetingTableProps) {
    const startedMeetingRows = props.meetings
        .sort((a, b) => a.id - b.id)
        .map((m) => (
            <tr key={m.id}>
                <StartedMeetingEditor
                    {...props}
                    meeting={m}
                    readableMeetingType={getBackendByName(m.backend_type, props.backends).friendly_name}
                />
            </tr>
        ));

    const startedMeetingsTable = props.meetings.length
        ? (
            <Table bordered responsive>
                <thead>
                    <tr>
                        <th scope="col">Attendee</th>
                        <th scope="col">Host</th>
                        <th scope="col">Details</th>
                        <th scope="col">Meeting Actions</th>
                    </tr>
                </thead>
                <tbody>{startedMeetingRows}</tbody>
            </Table>
        )
        : (
            <>
            <hr/>
            <p>There are currently no meetings in progress. Please create a meeting below to see it here.</p>
            </>
        );
    return startedMeetingsTable;
}

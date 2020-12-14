import * as React from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Col, Row, Table } from "react-bootstrap";

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
                <Badge variant='secondary' aria-label='Meeting Type'>{props.readableMeetingType}</Badge>
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
            <select className="form-control assign"
                value={props.meeting.assignee?.id ?? ""}
                onChange={onChangeAssignee}
                disabled={props.disabled}
            >
                {assigneeOptions}
            </select>
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

function UnstartedMeetingEditor (props: UnstartedMeetingEditorProps) {
    const attendee = props.meeting.attendees[0];
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

    return (
        <>
        <td><UserDisplay user={attendee}/></td>
        <td><AssigneeSelector {...props} /></td>
        <td><MeetingDetails {...props} /></td>
        <td><Row>{meetingActions}</Row></td>
        </>
    );
}

function StartedMeetingEditor (props: MeetingEditorProps) {
    const attendee = props.meeting.attendees[0];
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
                    <Button
                        variant='danger'
                        size='sm'
                        onClick={() => props.onRemoveMeeting(props.meeting)}
                        aria-label={`End Meeting with ${attendeeString}`}
                        disabled={props.disabled}
                    >
                        End Meeting
                    </Button>
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

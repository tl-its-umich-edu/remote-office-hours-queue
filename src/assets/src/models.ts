export type EnabledBackendName = 'zoom' | 'bluejeans' | 'inperson';

export interface MeetingBackend {
    name: EnabledBackendName;
    friendly_name: string;
    docs_url: string | null;
    telephone_num: string | null;
}

export interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    attendee_set?: User[];
    hosted_queues?: ReadonlyArray<QueueBase>;
}

export interface MyUser extends User {
    my_queue: QueueAttendee | null;
    phone_number: string;
    notify_me_attendee: boolean;
    notify_me_host: boolean;
    authorized_backends: {[backend: string]: boolean};
}

export interface BluejeansMetadata {
    user_email: string;
    user_id: number;
    meeting_id: number;
    meeting_url: string;
    numeric_meeting_id: string;  // Number for dial-in / URL
}

export interface ZoomMetadata extends BluejeansMetadata {}

export enum MeetingStatus {
    UNASSIGNED = 0,
    ASSIGNED = 1,
    STARTED = 2
}

export interface Meeting {
    id: number;
    line_place: number;
    attendees: User[];
    agenda: string;
    assignee?: User;
    backend_type: EnabledBackendName;
    backend_metadata?: BluejeansMetadata|ZoomMetadata;
    created_at: string;
    status: MeetingStatus;
}


export interface QueueBase {
    id: number;
    name: string;
    status: "open" | "closed";
}

export interface QueueFull extends QueueBase {
    created_at: string;
    description: string;
    hosts: User[];
    allowed_backends: string[];
}

export interface QueueHost extends QueueAttendee {
    meeting_set: Meeting[];
}

export interface QueueAttendee extends QueueFull {
    my_meeting: Meeting | null;
    line_length: number;
}

export const isQueueHost = (q: QueueAttendee | QueueHost): q is QueueHost => {
    return (q as QueueHost).meeting_set !== undefined;
}

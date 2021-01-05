export type EnabledBackendName = 'zoom' | 'bluejeans' | 'inperson';

export const VideoBackendNames: EnabledBackendName[] = ['zoom', 'bluejeans'];

export interface MeetingBackend {
    name: EnabledBackendName;
    friendly_name: string;
    docs_url: string | null;
    telephone_num: string | null;
    intl_telephone_url: string | null;
}

interface Base {
    id: number;
}

export interface User extends Base {
    username: string;
    first_name: string;
    last_name: string;
    attendee_set?: User[];
    hosted_queues?: ReadonlyArray<QueueBase>;
}

export const isUser = (value: any): value is User => {
    if (!value || typeof value !== 'object') return false;
    return 'username' in value && 'first_name' in value && 'last_name' in value;
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
    host_meeting_url: string;
    numeric_meeting_id: string;  // Number for dial-in / URL
}

export interface ZoomMetadata extends BluejeansMetadata {}

export enum MeetingStatus {
    UNASSIGNED = 0,
    ASSIGNED = 1,
    STARTED = 2
}

export interface Meeting extends Base {
    line_place: number | null;
    attendees: User[];
    agenda: string;
    assignee?: User;
    backend_type: EnabledBackendName;
    backend_metadata?: BluejeansMetadata|ZoomMetadata;
    created_at: string;
    status: MeetingStatus;
}

export const isMeeting = (entity: object): entity is Meeting => {
    return 'attendees' in entity;
}

export interface QueueBase extends Base {
    name: string;
    status: "open" | "closed";
}

export const isQueueBase = (entity: object): entity is QueueBase => {
    return 'name' in entity && 'status' in entity;
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

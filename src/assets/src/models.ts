export interface User {
    username: string;
    first_name: string;
    last_name: string;
}

export interface Attendee {
    id: number;
    user: User;
}

export interface Meeting {
    id: number;
    attendees: Attendee[];
}

export interface ManageQueue extends QueueBase {
    meetings: Meeting[];
}

export interface AttendingQueue extends QueueBase {
    queued_ahead?: number;
    queue_length: number;
}

export interface QueueBase {
    id: number;
    name: string;
    hosts: User[];
    created_at: string;
}

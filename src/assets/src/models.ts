export interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    attendee_set?: Attendee[];
}

export interface Attendee {
    id: number;
    user: User;
}

export interface Meeting {
    id: number;
    place_in_line: number;
    attendees: Attendee[];
}

export interface ManageQueue extends AttendingQueue {
    meetings: Meeting[];
}

export interface AttendingQueue extends QueueBase {
    my_meeting?: Meeting;
    queue_length: number;
}

export interface QueueBase {
    id: number;
    name: string;
    hosts: User[];
    created_at: string;
}

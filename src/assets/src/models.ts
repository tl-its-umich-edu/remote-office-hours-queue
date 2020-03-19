export interface User {
    username: string;
    first_name: string;
    last_name: string;
}

export interface Host {
    id: number;
    user: User;
}

export interface Attendee {
    id: number;
    user: User;
}

export interface Meeting {
    id: number;
    attendees: Attendee[];
}

export interface Queue {
    id: number;
    name: string;
    hosts: Host[];
    created_at: string;
    meetings: Meeting[];
}

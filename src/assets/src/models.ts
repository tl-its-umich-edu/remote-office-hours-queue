export interface User {
    username: string;
    first_name: string;
    last_name: string;
}

export interface Host {
    user: User;
}

export interface Attendee {
    user: User;
}

export interface Meeting {
    attendees: Attendee[];
}

export interface Queue {
    name: string;
    hosts: Host[];
    created_at: string;
    meetings: Meeting[];
}

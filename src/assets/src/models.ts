"use strict";

export interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    attendee_set?: User[];
}

export interface Meeting {
    id: number;
    line_place: number;
    attendees: User[];
}

export interface ManageQueue extends AttendingQueue {
    meeting_set: Meeting[];
}

export interface AttendingQueue extends QueueBase {
    my_meeting: Meeting | null;
    line_length: number;
}

export interface QueueBase {
    id: number;
    name: string;
    hosts: User[];
    created_at: string;
}

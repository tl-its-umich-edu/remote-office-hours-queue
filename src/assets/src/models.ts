export interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    attendee_set?: User[];
    hosted_queues?: ReadonlyArray<QueueBase>;
}

export interface MyUser extends User {
    my_queue: QueueAttendee | null;
}

export interface BluejeansMetadata {
    user_email: string;
    user_id: number;
    meeting_id: number;
    meeting_url: string;
    numeric_meeting_id: string;  // Number for dial-in / URL
}

export interface Meeting {
    id: number;
    line_place: number;
    attendees: User[];
    agenda: string;
    assignee?: User;
    backend_type: "bluejeans"|"zoom"|"inperson";
    backend_metadata?: BluejeansMetadata;
    created_at: string;
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

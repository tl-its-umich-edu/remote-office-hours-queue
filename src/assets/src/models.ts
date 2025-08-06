export type EnabledBackendName = "zoom" | "inperson";

export const VideoBackendNames: EnabledBackendName[] = ["zoom"];

export interface MeetingBackend {
  name: EnabledBackendName;
  friendly_name: string;
  enabled: boolean;
  docs_url: string | null;
  profile_url?: string;
  telephone_num: string | null;
  intl_telephone_url: string | null;
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
  notify_me_announcement: boolean;
  authorized_backends: { [backend: string]: boolean };
}

export interface ZoomMetadata {
  user_email: string;
  user_id: number;
  meeting_id: number;
  meeting_url: string;
  host_meeting_url: string;
  numeric_meeting_id: string; // Number for dial-in / URL
}

export enum MeetingStatus {
  UNASSIGNED = 0,
  ASSIGNED = 1,
  STARTED = 2,
}

export interface Meeting {
  id: number;
  line_place: number | null;
  attendees: User[];
  agenda: string;
  assignee?: User;
  backend_type: EnabledBackendName;
  backend_metadata?: ZoomMetadata;
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
  inperson_location: string;
}

export interface QueueHost extends QueueAttendee {
  meeting_set: Meeting[];
}

export interface QueueAttendee extends QueueFull {
  my_meeting: Meeting | null;
  line_length: number;
  current_announcement: QueueAnnouncement | null;
}

export interface QueueAnnouncement {
  id: number;
  text: string;
  created_at: string;
  created_by: User;
  active: boolean;
}

export const isQueueHost = (q: QueueAttendee | QueueHost): q is QueueHost => {
  return (q as QueueHost).meeting_set !== undefined;
};

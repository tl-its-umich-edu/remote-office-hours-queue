import { MeetingBackend, User } from "../models";

export interface PageProps {
    user?: User;
    loginUrl: string;
    backends: MeetingBackend[];
    defaultBackend: string;
    otpRequestBuffer: number;
}

import { RouteComponentProps } from "react-router";
import { MeetingBackend, User } from "../models";

export interface PageProps<TParams = {}> extends RouteComponentProps<TParams> {
    user?: User;
    loginUrl: string;
    backends: MeetingBackend[];
    defaultBackend: string;
}

import { RouteComponentProps } from "react-router";
import { MeetingBackend, User } from "../models";

export interface PageProps<TParams extends { [K in keyof TParams]?: string | undefined; } = {}> extends RouteComponentProps<TParams> {
    user?: User;
    loginUrl: string;
    backends: MeetingBackend[];
    defaultBackend: string;
}

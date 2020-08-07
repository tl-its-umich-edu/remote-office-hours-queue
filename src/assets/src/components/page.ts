import { RouteComponentProps } from "react-router";
import { User } from "../models";

export interface PageProps<TParams = {}> extends RouteComponentProps<TParams> {
    user?: User;
    loginUrl: string;
    backends: {[backend_type: string]: string};
    defaultBackend: string;
}

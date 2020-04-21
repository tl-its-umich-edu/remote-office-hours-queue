import { RouteComponentProps } from "react-router";
import { User } from "../models";
import { RefObject } from "react";
import Dialog from "react-bootstrap-dialog";

export interface PageProps<TParams = {}> extends RouteComponentProps<TParams> {
    user?: User;
    triggerLoginModal: () => void;
}

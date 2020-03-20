import * as React from "react";
import { User } from "../models";

interface UserDisplayProps {
    user: User;
}

export const UserDisplay = (props: UserDisplayProps) =>
    <span>
        {props.user.first_name} {props.user.last_name} <em>({props.user.username})</em>
    </span>

interface RemoveButtonProps {
    remove: () => void;
}

export const RemoveButton: React.FC<RemoveButtonProps> = (props) =>
    <button onClick={() => props.remove()} className="btn btn-sm btn-danger">
        <span aria-hidden="true">&times;</span>
        {props.children}
    </button>

interface AddButtonProps {
    add: () => void;
}

export const AddButton: React.FC<AddButtonProps> = (props) =>
    <button onClick={() => props.add()} className="btn btn-success">
        +{props.children}
    </button>

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
    size?: "block"|"lg"|"sm";
}

export const RemoveButton: React.FC<RemoveButtonProps> = (props) => {
    const className = "btn btn-danger " + (props.size ? ` btn-${props.size}` : "");
    return (
        <button onClick={() => props.remove()} className={className}>
            <span aria-hidden="true">&times;</span>
            {props.children}
        </button>
    );
}

interface AddButtonProps {
    add: () => void;
    size?: "block"|"lg"|"sm";
}

export const AddButton: React.FC<AddButtonProps> = (props) => {
    const className = "btn btn-success" + (props.size ? ` btn-${props.size}` : "");
    return (
        <button onClick={() => props.add()} className={className}>
            <span aria-hidden="true">+</span>
            {props.children}
        </button>
    );
}

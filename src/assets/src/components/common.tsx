import * as React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { User } from "../models";
import { useState } from "react";

export const DisabledMessage = <em></em>

interface UserDisplayProps {
    user: User;
}

export const UserDisplay = (props: UserDisplayProps) =>
    <span>
        {props.user.first_name} {props.user.last_name} <em>({props.user.username})</em>
    </span>

interface RemoveButtonProps {
    remove: () => void;
    disabled: boolean;
    size?: "block"|"lg"|"sm";
}

export const RemoveButton: React.FC<RemoveButtonProps> = (props) => {
    const className = "btn btn-danger " + (props.size ? ` btn-${props.size}` : "");
    const disabledMessage = props.disabled && DisabledMessage;
    return (
        <button onClick={() => props.remove()} disabled={props.disabled} className={className}>
            <span aria-hidden="true">&times;</span>
            {props.children}
            {disabledMessage}
        </button>
    );
}

interface AddButtonProps {
    add: () => void;
    disabled: boolean;
    size?: "block"|"lg"|"sm";
}

export const AddButton: React.FC<AddButtonProps> = (props) => {
    const className = "btn btn-success" + (props.size ? ` btn-${props.size}` : "");
    const disabledMessage = props.disabled && DisabledMessage;
    return (
        <button onClick={() => props.add()} disabled={props.disabled} className={className}>
            <span aria-hidden="true">+</span>
            {props.children}
            {disabledMessage}
        </button>
    );
}

interface LoadingDisplayProps {
    loading: boolean;
}

export const LoadingDisplay: React.FC<LoadingDisplayProps> = (props) => {
    if (!props.loading) return null;
    return (
        <p className="bottom-right alert alert-info">
            <FontAwesomeIcon icon={faSyncAlt} spin />
        </p>
    )
}

interface ErrorDisplayProps {
    error?: Error;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = (props) => {
    if (!props.error) return null;
    return (
        <p className="alert alert-danger">
            {props.error.toString()}
        </p>
    )
}

interface SingleInputFormProps {
    placeholder: string;
    disabled: boolean;
    onSubmit: (value: string) => void;
}

export const SingleInputForm: React.FC<SingleInputFormProps> = (props) => {
    const [value, setValue] = useState("");
    return (
        <form onSubmit={(e) => { props.onSubmit(value); e.preventDefault(); setValue(""); }} className="input-group">
            <input onChange={(e) => setValue(e.target.value)} value={value} type="text" className="form-control" placeholder={props.placeholder}/>
            <div className="input-group-append">
                <button className="btn btn-primary" type="submit">
                    {props.children}
                </button>
            </div>
        </form>
    );
}

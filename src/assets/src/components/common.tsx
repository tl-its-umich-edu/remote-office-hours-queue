import * as React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt, faClipboard, faClipboardCheck, faPencilAlt } from '@fortawesome/free-solid-svg-icons'
import { User, AttendingQueue } from "../models";
import { useState, createRef, useEffect } from "react";
import { Link } from "react-router-dom";

type BootstrapButtonTypes = "info"|"warning"|"success"|"primary"|"alternate"|"danger";

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
    );
}

interface ErrorDisplayProps {
    error?: Error;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = (props) => {
    if (!props.error) return null;
    return (
        <p className="alert alert-danger" role="alert">
            {props.error.message}
        </p>
    );
}

interface SingleInputFormProps {
    placeholder: string;
    disabled: boolean;
    onSubmit: (value: string) => void;
    buttonType: BootstrapButtonTypes;
}

interface StatelessSingleInputFormProps extends SingleInputFormProps {
    value: string;
    setValue: (value: string) => void;
    error?: Error;
    setError: (error: Error|undefined) => void;
    autofocus?: boolean;
}

const StatelessSingleInputForm: React.FC<StatelessSingleInputFormProps> = (props) => {
    const inputRef = createRef<HTMLInputElement>();
    useEffect(() => {
        if (!props.autofocus) return;
        inputRef.current!.focus();
    }, []);
    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            props.onSubmit(props.value);
            props.setValue("");
        } catch(e) {
            props.setError(e);
        }
    }
    const errorDisplay = props.error && <ErrorDisplay error={props.error}/>
    const buttonClass = "btn btn-" + props.buttonType;
    return (
        <form onSubmit={submit} className="input-group">
            <input onChange={(e) => props.setValue(e.target.value)} value={props.value} 
                ref={inputRef} type="text" className="form-control" placeholder={props.placeholder}
                disabled={props.disabled}/>
            <div className="input-group-append">
                <button className={buttonClass} type="submit" disabled={props.disabled}>
                    {props.children}
                </button>
            </div>
            {errorDisplay}
        </form>
    );
}

export const SingleInputForm: React.FC<SingleInputFormProps> = (props) => {
    const [value, setValue] = useState("");
    const [error, setError] = useState(undefined as Error | undefined);
    return (
        <StatelessSingleInputForm
            value={value} setValue={setValue}
            error={error} setError={setError}
            {...props}
            />
    );
}

export const invalidUniqnameMessage = (uniqname: string) =>
    uniqname + " is not a valid user. Please make sure the uniqname is correct, and that they have logged onto Remote Office Hours Queue at least once."

interface DateDisplayProps {
    date: string;
}

export const DateDisplay = (props: DateDisplayProps) =>
    <span>{new Date(props.date).toDateString()}</span>

interface CopyFieldProps {
    text: string;
}

export const CopyField: React.FC<CopyFieldProps> = (props) => {
    const [copied, setCopied] = useState(false);
    const inputRef = createRef<HTMLInputElement>();
    const copy = () => {
        inputRef.current!.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
    }
    const buttonInner = copied
        ? <span><FontAwesomeIcon icon={faClipboardCheck}/> Copied!</span>
        : <span><FontAwesomeIcon icon={faClipboard}/> Copy</span>
    return (
        <div className="input-group">
            <input readOnly ref={inputRef} onClick={copy} value={props.text} type="text" className="form-control"/>
            <div className="input-group-append">
                <button type="button" onClick={copy} className="btn btn-secondary">
                    {buttonInner}
                </button>
            </div>
        </div>
    );
}

interface EditToggleFieldProps {
    text: string;
    placeholder: string;
    disabled: boolean;
    onSubmit: (value: string) => void;
    buttonType: BootstrapButtonTypes;
}

export const EditToggleField: React.FC<EditToggleFieldProps> = (props) => {
    const [editing, setEditing] = useState(false);
    const [editorValue, setEditorValue] = useState(props.text);
    const [editorError, setEditorError] = useState(undefined as Error | undefined);
    const submit = (value: string) => {
        props.onSubmit(value);
        setEditing(false);
    }
    const enableEditMode = () => {
        setEditing(true);
        setEditorValue(props.text);
    }
    const contents = (editing && !props.disabled)
        ? (
            <StatelessSingleInputForm 
                autofocus={true}
                onSubmit={submit}
                value={editorValue} setValue={setEditorValue}
                error={editorError} setError={setEditorError}
                placeholder={props.placeholder} disabled={props.disabled}
                buttonType="success">
                    {props.children}
            </StatelessSingleInputForm>
        )
        : (
            <div className="input-group">
                <span>{props.text}</span>
                <button onClick={enableEditMode} type="button" className="btn btn-sm">
                    <FontAwesomeIcon icon={faPencilAlt}/>
                    Edit
                </button>
            </div>
        );
    return contents;
}

interface JoinedQueueAlertProps {
    joinedQueue: AttendingQueue;
}

export const JoinedQueueAlert: React.FC<JoinedQueueAlertProps> = (props) => {
    return (
        <p className="col-lg alert alert-danger" role="alert">
            <strong>You may only join one queue. </strong>
            You are currently in {props.joinedQueue.name}. 
            If you choose to join another queue, you will lose your current place in line.
            <br/>
            <Link to={`/queue/${props.joinedQueue.id}`} className="btn btn-danger">
                Return to Previous Queue
            </Link>
        </p>
    );
}

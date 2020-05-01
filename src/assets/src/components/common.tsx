import * as React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt, faClipboard, faClipboardCheck, faPencilAlt, faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { User, AttendingQueue } from "../models";
import { useState, createRef, useEffect } from "react";
import { Link } from "react-router-dom";
import Modal from "react-bootstrap/Modal";

type BootstrapButtonTypes = "info" | "warning" | "success" | "primary" | "alternate" | "danger";

export const DisabledMessage = <em></em>

interface UserDisplayProps {
    user: User;
}

export const UserDisplay = (props: UserDisplayProps) =>
    <span>
        {props.user.first_name} {props.user.last_name} <em>({props.user.username})</em>
    </span>

interface RemoveButtonProps {
    onRemove: () => void;
    disabled: boolean;
    size?: "block" | "lg" | "sm";
    screenReaderLabel: string;
}

export const RemoveButton: React.FC<RemoveButtonProps> = (props) => {
    const className = "btn btn-danger " + (props.size ? ` btn-${props.size}` : "");
    const disabledMessage = props.disabled && DisabledMessage;
    return (
        <button onClick={() => props.onRemove()} disabled={props.disabled} className={className} aria-label={props.screenReaderLabel}>
            <FontAwesomeIcon icon={faTrashAlt} />
            {props.children}
            {disabledMessage}
        </button>
    );
}

interface AddButtonProps {
    onAdd: () => void;
    disabled: boolean;
    size?: "block" | "lg" | "sm";
    screenReaderLabel: string;
}

export const AddButton: React.FC<AddButtonProps> = (props) => {
    const className = "btn btn-success" + (props.size ? ` btn-${props.size}` : "");
    const disabledMessage = props.disabled && DisabledMessage;
    return (
        <button onClick={() => props.onAdd()} disabled={props.disabled} className={className} aria-label={props.screenReaderLabel}>
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
    id: string;
}

interface StatelessSingleInputFormProps extends SingleInputFormProps {
    value: string;
    error?: Error;
    autofocus?: boolean;
    onChangeValue: (value: string) => void;
    onError: (error: Error | undefined) => void;
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
            props.onChangeValue("");
        } catch (e) {
            props.onError(e);
        }
    }
    const errorDisplay = props.error && <ErrorDisplay error={props.error} />
    const buttonClass = "btn btn-" + props.buttonType;
    return (
        <form onSubmit={submit} className="input-group">
            <input onChange={(e) => props.onChangeValue(e.target.value)} value={props.value}
                ref={inputRef} type="text" className="form-control" placeholder={props.placeholder}
                disabled={props.disabled} id={props.id} />
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
            id={props.id}
            value={value} onChangeValue={setValue}
            error={error} onError={setError}
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
    id: string;
}

export const CopyField: React.FC<CopyFieldProps> = (props) => {
    const [copied, setCopied] = useState(false);
    const inputRef = createRef<HTMLInputElement>();
    const copy = () => {
        inputRef.current!.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    }
    const buttonInner = copied
        ? <span><FontAwesomeIcon icon={faClipboardCheck} /> Copied!</span>
        : <span><FontAwesomeIcon icon={faClipboard} /> Copy</span>
    const copiedSrAlert = copied
        && <span className="sr-only" role="alert" aria-live="polite">Copied</span>
    return (
        <>
            <div className="input-group">
                <input readOnly id={props.id} ref={inputRef} onClick={copy} value={props.text} type="text" className="form-control" />
                <div className="input-group-append">
                    <button type="button" onClick={copy} className="btn btn-secondary">
                        {buttonInner}
                    </button>
                </div>
            </div>
            {copiedSrAlert}
        </>
    );
}

interface EditToggleFieldProps {
    text: string;
    placeholder: string;
    disabled: boolean;
    buttonType: BootstrapButtonTypes;
    id: string;
    onSubmit: (value: string) => void;
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
                id={props.id}
                autofocus={true}
                onSubmit={submit}
                value={editorValue} onChangeValue={setEditorValue}
                error={editorError} onError={setEditorError}
                placeholder={props.placeholder} disabled={props.disabled}
                buttonType="success">
                {props.children}
            </StatelessSingleInputForm>
        )
        : (
            <div className="input-group">
                <span>{props.text}</span>
                <button onClick={enableEditMode} type="button" className="btn btn-sm">
                    <FontAwesomeIcon icon={faPencilAlt} />
                    Edit
                </button>
            </div>
        );
    return contents;
}

interface JoinedQueueAlertProps {
    joinedQueue: AttendingQueue;
}

export const JoinedQueueAlert: React.FC<JoinedQueueAlertProps> = (props) =>
    <p className="col-lg alert alert-danger" role="alert">
        <strong>You may only join one queue. </strong>
        You are currently in {props.joinedQueue.name}.
        If you choose to join another queue, you will lose your current place in line.
        <br />
        <Link to={`/queue/${props.joinedQueue.id}`} className="btn btn-danger">
            Return to Previous Queue
        </Link>
    </p>

interface LoginDialogProps {
    visible: boolean;
}

export const LoginDialog = (props: LoginDialogProps) =>
    <Modal show={props.visible}>
        <Modal.Header>
            <Modal.Title>Session Expired</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <p className="alert alert-warning">Your session has timed out. Some work may be lost. Please login again via the "Login" link below.</p>
        </Modal.Body>
        <Modal.Footer>
            <a href={'/oidc/authenticate/?next=' + location.pathname} className="btn btn-primary">Login</a>
        </Modal.Footer>
    </Modal>

interface BlueJeansOneTouchDialLinkProps {
    phone: string; // "." delimited
    meetingNumber: string;
}

export const BlueJeansOneTouchDialLink = (props: BlueJeansOneTouchDialLinkProps) => 
    <a href={`tel:${props.phone.replace(".", "")},,,${props.meetingNumber},%23,%23`}>
        {props.phone}
    </a>

interface BreadcrumbsProps {
    currentPageTitle: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = (props) => {
    const homeLink = props.currentPageTitle !== "Home"
        && (
            <li>
                <Link to="/">Home</Link>
            </li>
        );
    return (
        <ol className="breadcrumbs">
            {homeLink}
            {props.children}
            <li>
                {props.currentPageTitle}
            </li>
        </ol>
    );
}

import * as React from "react"
import { createRef, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt, faClipboard, faClipboardCheck, faPencilAlt, faTrashAlt, faHome } from '@fortawesome/free-solid-svg-icons'
import { Alert, Breadcrumb, Button, Form, Modal } from "react-bootstrap"
import { QueueAttendee, User } from "../models"

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

export interface FormError {
    source: string;
    error: Error;
}

export const checkForbiddenError = (pair: FormError) => {
    return (pair.error.name === "ForbiddenError");
}

interface ErrorDisplayProps {
    formErrors: FormError[];
}


export const ErrorDisplay: React.FC<ErrorDisplayProps> = (props) => {
    const messages = props.formErrors.map(
        (a: FormError, index: number) => <p key={index}><b>{a.source}:</b> {a.error.message}</p>
    );
    if (messages.length === 0) return null;
    return (<Alert variant='danger'>{messages}</Alert>);
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
    autofocus?: boolean;
    onChangeValue: (value: string) => void;
}

const StatelessSingleInputForm: React.FC<StatelessSingleInputFormProps> = (props) => {
    const inputRef = createRef<HTMLInputElement>();
    useEffect(() => {
        if (!props.autofocus) return;
        inputRef.current!.focus();
    }, []);
    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
            props.onSubmit(props.value);
            props.onChangeValue("");
    }
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
        </form>
    );
}


export const SingleInputForm: React.FC<SingleInputFormProps> = (props) => {
    const [value, setValue] = useState("");
    return (
        <StatelessSingleInputForm
            id={props.id}
            value={value} onChangeValue={setValue}
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
    <span>{
        new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(new Date(props.date))
    }</span>


interface DateTimeDisplayProps {
    dateTime: string;
}

export const DateTimeDisplay = (props: DateTimeDisplayProps) =>
    <span>{
        new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date(props.dateTime))
    }</span>


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
    initialState: boolean;
}

export const EditToggleField: React.FC<EditToggleFieldProps> = (props) => {
    const [editing, setEditing] = useState(props.initialState);
    const [editorValue, setEditorValue] = useState(props.text);
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
                placeholder={props.placeholder} disabled={props.disabled}
                buttonType="success">
                {props.children}
            </StatelessSingleInputForm>
        )
        : (
            <div className="input-group">
                <span>{props.text}</span>
                <button onClick={enableEditMode} type="button" className="btn btn-sm">
                    <FontAwesomeIcon icon={faPencilAlt} /> Edit
                </button>
            </div>
        );
    return contents;
}

interface SingleInputFormShowRemainingProps extends StatelessSingleInputFormProps {
    maxLength: number
}

export const SingleInputFormShowRemaining: React.FC<SingleInputFormShowRemainingProps> = (props) => {
    const [remaining, setRemaining] = useState(props.maxLength - props.value.length as number)
    const [isInvalid, setIsInvalid] = useState(false as boolean)
    const buttonClass = `btn btn-${props.buttonType} remaining-controls` as string

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        props.onSubmit(props.value)
        props.onChangeValue('')
    }
    const handleChange = (newValue: string) => {
        props.onChangeValue(newValue);
        if (newValue.length <= props.maxLength) { setIsInvalid(false) } else { setIsInvalid(true) }
        setRemaining(props.maxLength - newValue.length)
    }

    const charsRemaining = (remaining > 0) ? remaining : 0 as number
    const charsOver = (remaining < 0) ? ` (${remaining * -1} over limit)` : '' as string
    const feedbackText = `Remaining characters: ${charsRemaining}/${props.maxLength}` + charsOver as string

    return (
        <Form onSubmit={handleSubmit}>
            <Form.Group>
                <Form.Control
                    id={props.id}
                    as='textarea'
                    rows={5}
                    value={props.value}
                    placeholder={props.placeholder}
                    onChange={(e) => handleChange(e.currentTarget.value)}
                    disabled={props.disabled}
                    isInvalid={!!isInvalid}
                />
            </Form.Group>
            <div className="remaining-controls-group">
                <span className={isInvalid ? 'text-danger' : undefined}>{feedbackText}</span>
                <Button bsPrefix={buttonClass} type='submit' disabled={props.disabled || isInvalid}>{props.children}</Button>
            </div>
        </Form>
    )
}


interface ShowRemainingFieldProps extends EditToggleFieldProps {
    maxLength: number;
}

export const ShowRemainingField: React.FC<ShowRemainingFieldProps> = (props) => {
    const [editing, setEditing] = useState(props.initialState);
    const [editorValue, setEditorValue] = useState(props.text);
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
            <SingleInputFormShowRemaining
                id={props.id}
                autofocus={true}
                onSubmit={submit}
                value={editorValue}
                onChangeValue={setEditorValue}
                placeholder={props.placeholder}
                disabled={props.disabled}
                buttonType="success"
                maxLength={props.maxLength}>
                {props.children}
            </SingleInputFormShowRemaining>
        )
        : (
            <div className="input-group">
                <span>{props.text}</span>
                <button onClick={enableEditMode} type="button" className="btn btn-sm">
                    <FontAwesomeIcon icon={faPencilAlt} /> Edit
                </button>
            </div>
        );
    return contents;
}

interface JoinedQueueAlertProps {
    joinedQueue: QueueAttendee;
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
    loginUrl: string;
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
            <a href={props.loginUrl + '?next=' + location.pathname} className="btn btn-primary">Login</a>
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

interface BlueJeansDialInMessageProps {
    meetingNumber: string;
}

export const BlueJeansDialInMessage = (props: BlueJeansDialInMessageProps) => {
    const phoneLinkUsa = <BlueJeansOneTouchDialLink phone="1.312.216.0325" meetingNumber={props.meetingNumber} />
    return (
        <span>
            Having problems with video? As a back-up, you can call {phoneLinkUsa} from the USA 
            (or <a target="_blank" href="https://www.bluejeans.com/premium-numbers"> find your international number to call in from outside the USA</a>) 
            from any phone and enter {props.meetingNumber}#.
        </span>
    )
}

interface BreadcrumbsProps {
    intermediatePages?: {title: string, href: string}[];
    currentPageTitle: string;
}

export const Breadcrumbs = (props: BreadcrumbsProps) => {
    const homeLink = props.currentPageTitle !== "Home"
        && (
            <li className="breadcrumb-item">
                <Link to="/"><FontAwesomeIcon icon={faHome}/> Remote Office Hours Queue</Link>
            </li>
        );
    const intermediateCrumbs = props.intermediatePages?.map(ip => (
        <li className="breadcrumb-item" key={ip.href}>
            <Link to={ip.href}>{ip.title}</Link>
        </li>
    ));
    const current = props.currentPageTitle !== "Home"
        ? (
            <Breadcrumb.Item active>
                {props.currentPageTitle}
            </Breadcrumb.Item>
        )
        : (
            <Breadcrumb.Item active>
                <FontAwesomeIcon icon={faHome}/> Remote Office Hours Queue
            </Breadcrumb.Item>
        );
    return (
        <Breadcrumb>
            {homeLink}
            {intermediateCrumbs}
            {current}
        </Breadcrumb>

    );
}

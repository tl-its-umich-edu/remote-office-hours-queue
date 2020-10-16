import * as React from "react";
import { createRef, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSyncAlt, faClipboard, faClipboardCheck, faPencilAlt, faTrashAlt, faHome } from '@fortawesome/free-solid-svg-icons';
import { Alert, Badge, Breadcrumb, Button, Form, InputGroup, Modal, Table } from "react-bootstrap";
import { StringSchema } from "yup";
import { QueueAttendee, QueueBase, User } from "../models";
import { validateString } from "../validation";

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
        (a: FormError, index: number) => (
            <Alert variant='danger' key={index}><b>{a.source}:</b> {a.error.message}</Alert>
        )
    );
    if (messages.length === 0) return null;
    return <div>{messages}</div>;
}


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


interface SingleInputFormProps {
    id: string;
    placeholder: string;
    disabled: boolean;
    onSubmit?: (value: string) => void;
    buttonType?: BootstrapButtonTypes;
}

// Stateless Field Components

interface StatelessValidatedInputFormProps extends SingleInputFormProps {
    value: string;
    feedbackMessages: ReadonlyArray<string>;
    isInvalid: boolean | undefined;
    onChangeValue: (value: string) => void;
}

export const StatelessInputGroupForm: React.FC<StatelessValidatedInputFormProps> = (props) => {
    let buttonBlock;
    let handleSubmit;
    if (props.buttonType && props.onSubmit) {
        const { buttonType, onSubmit } = props;
        const buttonClass = `btn btn-${buttonType}`;
        handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            onSubmit(props.value);
        };
        buttonBlock = (
            <InputGroup.Append>
                <Button bsPrefix={buttonClass} type='submit' disabled={props.disabled}>
                    {props.children}
                </Button>
            </InputGroup.Append>
        );
    }

    const handleChange = (newValue: string) => props.onChangeValue(newValue);

    const feedbackTextClass = props.isInvalid ? ' text-danger' : '';
    let feedback;
    if (props.feedbackMessages.length > 0) {
        // Only show one message at a time.
        feedback = <Form.Text bsPrefix={`form-text form-feedback${feedbackTextClass}`}>{props.feedbackMessages[0]}</Form.Text>;
    }

    return (
        <Form onSubmit={handleSubmit}>
            <InputGroup>
                <Form.Control
                    id={props.id}
                    as='input'
                    bsPrefix='form-control form-control-remaining'
                    value={props.value}
                    placeholder={props.placeholder}
                    onChange={(e: any) => handleChange(e.currentTarget.value)}
                    disabled={props.disabled}
                    isInvalid={props.isInvalid}
                />
            {buttonBlock}
            </InputGroup>
            {feedback}
        </Form>
    );
}

export const StatelessTextAreaForm: React.FC<StatelessValidatedInputFormProps> = (props) => {
    let buttonBlock;
    let handleSubmit;
    if (props.buttonType && props.onSubmit) {
        const { buttonType, onSubmit } = props;
        const buttonClass = `btn btn-${buttonType} remaining-controls`;
        handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            onSubmit(props.value);
        };
        buttonBlock = (
            <Button bsPrefix={buttonClass} type='submit' disabled={props.disabled}>
                {props.children}
            </Button>
        );
    }

    const handleChange = (newValue: string) => props.onChangeValue(newValue);

    const feedbackTextClass = props.isInvalid ? ' text-danger' : '';
    let feedback;
    if (props.feedbackMessages.length > 0) {
        // Only show one message at a time.
        feedback = <span className={`form-feedback${feedbackTextClass}`}>{props.feedbackMessages[0]}</span>;
    }

    return (
        <Form onSubmit={handleSubmit}>
            <Form.Group>
                <Form.Control
                    id={props.id}
                    as='textarea'
                    rows={5}
                    bsPrefix='form-control form-control-remaining'
                    value={props.value}
                    placeholder={props.placeholder}
                    onChange={(e) => handleChange(e.currentTarget.value)}
                    disabled={props.disabled}
                    isInvalid={props.isInvalid}
                />
            </Form.Group>
            {
                (feedback || buttonBlock)
                    ? (
                        <div className="remaining-controls-group">
                            {feedback}
                            {buttonBlock}
                        </div>
                    )
                    : undefined
            }
        </Form>
    );
}

// Stateful Field Components

interface SingleInputFieldProps {
    id: string;
    value?: string;
    placeholder: string;
    buttonType: BootstrapButtonTypes;
    disabled: boolean;
    onSubmit: (value: string) => void;
    fieldComponent: React.FC<StatelessValidatedInputFormProps>;
    fieldSchema: StringSchema;
    showRemaining?: boolean;
    onSuccess?: () => void;
}

// Stateful wrapper for one text input field and associated feedback
export const SingleInputField: React.FC<SingleInputFieldProps> = (props) => {
    const [value, setValue] = useState(props.value ? props.value : '');
    const [isInvalid, setIsInvalid] = useState(undefined as undefined | boolean);
    const [feedbackMessages, setFeedbackMessages] = useState([] as ReadonlyArray<string>);

    const validate = (value: string): boolean => {
        const { isInvalid, messages } = validateString(value, props.fieldSchema, !!props.showRemaining);
        setIsInvalid(isInvalid);
        setFeedbackMessages(messages);
        return isInvalid;
    }

    const handleSubmit = (value: string) => {
        // If it hasn't been validated yet, validate it now.
        let newIsInvalid = undefined as undefined | boolean;
        if (isInvalid === undefined) {
            newIsInvalid = validate(value);
        }
        if (isInvalid === false || newIsInvalid === false) {
            props.onSubmit(value);
            setIsInvalid(undefined);
            setFeedbackMessages([]);
            setValue('');
            if (props.onSuccess) {
                props.onSuccess();
            }
        }
    };

    const handleChange = (value: string) => {
        setValue(value);
        validate(value);
    };

    return (
        <props.fieldComponent
            {...props}
            value={value}
            isInvalid={isInvalid}
            feedbackMessages={feedbackMessages}
            onSubmit={handleSubmit}
            onChangeValue={handleChange}
        >
            {props.children}
        </props.fieldComponent>
    );
}

interface EditToggleFieldProps extends SingleInputFieldProps {
    value: string;
    initialState: boolean;
}

// Wrapper for input fields that can be expanded or hidden with an Edit button
export const EditToggleField: React.FC<EditToggleFieldProps> = (props) => {
    const [editing, setEditing] = useState(props.initialState);

    const toggleEditMode = () => setEditing(!editing);

    const contents = (editing && !props.disabled)
        ? <SingleInputField {...props} onSuccess={toggleEditMode}>{props.children}</SingleInputField>
        : (
            <div className="input-group">
                <span>{props.value}</span>
                <button onClick={toggleEditMode} type="button" className="btn btn-sm">
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

interface QueueTableProps {
    queues: ReadonlyArray<QueueBase>;
    manageLink?: boolean | undefined;
}

export function QueueTable (props: QueueTableProps) {
    const linkBase = props.manageLink ? '/manage/' : '/queue/'
    const badgeClass = 'queue-table-badge'

    const queueItems = props.queues.map(q => (
        <tr key={q.id}>
            <td aria-label={`Queue ID Number`}>
                <Link to={`${linkBase}${q.id}`}>
                    <Badge className={badgeClass} variant='primary' pill={true}>{q.id}</Badge>
                </Link>
            </td>
            <td aria-label={`Name for Queue ID ${q.id}`}>
                <Link to={`${linkBase}${q.id}`}>{q.name}</Link>
            </td>
            <td aria-label={`Status for Queue ID ${q.id}`}>
                <Link to={`${linkBase}${q.id}`}>
                    <Badge className={badgeClass} variant={q.status === 'open' ? 'success' : 'danger'} pill={true}>
                        {q.status}
                    </Badge>
                </Link>
            </td>
        </tr>
    ));
    return (
        <Table bordered hover aria-label='Queue Table with Links'>
            <thead>
                <tr>
                    <th aria-label='Queue ID Number'>Queue ID</th>
                    <th aria-label='Queue Name'>Name</th>
                    <th aria-label='Queue Status'>Status</th>
                </tr>
            </thead>
            <tbody>{queueItems}</tbody>
        </Table>
    );
}

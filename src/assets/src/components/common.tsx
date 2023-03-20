import * as React from "react";
import { createRef, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSyncAlt, faClipboard, faClipboardCheck, faPencilAlt, faTrashAlt, faHome } from '@fortawesome/free-solid-svg-icons';
import { Alert, Badge, Breadcrumb, Button, Form, InputGroup, Modal, Table } from "react-bootstrap";
import { StringSchema } from "yup";

import { useStringValidation } from "../hooks/useValidation";
import { useInitFocusRef } from "../hooks/useInitFocusRef";
import { QueueAttendee, QueueBase, User } from "../models";
import { sortQueues } from "../sort";
import { ValidationResult } from "../validation";

type BootstrapButtonTypes = "info" | "warning" | "success" | "primary" | "alternate" | "danger";

export const DisabledMessage = <em></em>


interface UserDisplayProps {
    user: User;
}

export const UserDisplay = (props: UserDisplayProps) =>
    <span>
        {props.user.first_name} {props.user.last_name} <em>({props.user.username})</em>
    </span>

export const userLoggedOnWarning = (
    <Alert variant='primary'>
        <strong>Note:</strong> The person you want to add needs to have logged on to Remote Office Hours Queue
        at least once in order to be added.
    </Alert>
);

interface RemoveButtonProps {
    onRemove: () => void;
    disabled: boolean;
    size?: "block" | "lg" | "sm";
    screenReaderLabel: string;
    children?: React.ReactNode;
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
    children: React.ReactNode;
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
    const buttonRef = createRef<HTMLButtonElement>();
    const copy = (focusButton?: boolean) => {
        inputRef.current!.select();
        document.execCommand("copy");
        if (focusButton) buttonRef.current!.focus();
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
                <input readOnly id={props.id} ref={inputRef} onClick={() => copy()} value={props.text} type="text" className="form-control" />
                <div className="input-group-append">
                    <button type="button" ref={buttonRef} onClick={() => copy(true)} className="btn btn-secondary">
                        {buttonInner}
                    </button>
                </div>
            </div>
            {copiedSrAlert}
        </>
    );
}


interface ButtonOptions {
    onSubmit: (value: string) => void;
    buttonType: BootstrapButtonTypes;
}

interface SingleInputFormProps {
    id: string;
    formLabel: string;
    placeholder: string;
    disabled: boolean;
    buttonOptions?: ButtonOptions;
    initFocus?: boolean;
}

// Stateless Field Components

interface StatelessValidatedInputFormProps extends SingleInputFormProps {
    value: string;
    validationResult?: ValidationResult;
    onChangeValue: (value: string) => void;
    children?: React.ReactNode;
}

export const StatelessInputGroupForm: React.FC<StatelessValidatedInputFormProps> = (props) => {
    const inputRef = useInitFocusRef<HTMLInputElement>(!!props.initFocus);
    const handleChange = (newValue: string) => props.onChangeValue(newValue);

    let buttonBlock;
    let handleSubmit;
    if (props.buttonOptions) {
        const { onSubmit, buttonType } = props.buttonOptions;
        const buttonClass = `btn btn-${buttonType}`;
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

    let feedback;
    if (props.validationResult) {
        const { isInvalid, messages } = props.validationResult;
        const feedbackTextClass = isInvalid ? ' text-danger' : '';
        if (messages.length > 0) {
            // Only show one message at a time.
            feedback = <Form.Text className={`form-feedback${feedbackTextClass}`}>{messages[0]}</Form.Text>;
        }
    }

    return (
        <Form onSubmit={handleSubmit}>
            <InputGroup>
                <Form.Control
                    id={props.id}
                    as='input'
                    ref={inputRef}
                    value={props.value}
                    aria-label={props.formLabel}
                    placeholder={props.placeholder}
                    onChange={(e: any) => handleChange(e.currentTarget.value)}
                    disabled={props.disabled}
                    isInvalid={props.validationResult?.isInvalid}
                />
                {buttonBlock}
            </InputGroup>
            {feedback}
        </Form>
    );
}

export const StatelessTextAreaForm: React.FC<StatelessValidatedInputFormProps> = (props) => {
    const inputRef = useInitFocusRef<HTMLTextAreaElement>(!!props.initFocus);
    const handleChange = (newValue: string) => props.onChangeValue(newValue);

    let buttonBlock;
    let handleSubmit;
    if (props.buttonOptions) {
        const { onSubmit, buttonType } = props.buttonOptions;
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

    let feedback;
    if (props.validationResult) {
        const { isInvalid, messages } = props.validationResult;
        const feedbackTextClass = isInvalid ? ' text-danger' : '';
        if (messages.length > 0) {
            // Only show one message at a time.
            feedback = <span className={`form-feedback${feedbackTextClass}`}>{messages[0]}</span>;
        }
    }

    return (
        <Form onSubmit={handleSubmit}>
            <Form.Group>
                <Form.Control
                    id={props.id}
                    as='textarea'
                    rows={5}
                    ref={inputRef}
                    value={props.value}
                    aria-label={props.formLabel}
                    placeholder={props.placeholder}
                    onChange={(e) => handleChange(e.currentTarget.value)}
                    disabled={props.disabled}
                    isInvalid={props.validationResult?.isInvalid}
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
    formLabel: string;
    placeholder: string;
    disabled: boolean;
    buttonOptions: ButtonOptions;
    initFocus?: boolean;
    fieldComponent: React.FC<StatelessValidatedInputFormProps>;
    fieldSchema: StringSchema;
    showRemaining?: boolean;
    onSuccess?: () => void;
    children: React.ReactNode;
}

// Stateful wrapper for one text input field and associated feedback
export const SingleInputField: React.FC<SingleInputFieldProps> = (props) => {
    const [value, setValue] = useState(props.value ? props.value : '');
    const [validationResult, validateAndSetResult, clearResult] = useStringValidation(props.fieldSchema, !!props.showRemaining);

    const handleSubmit = (newValue: string) => {
        const curValidationResult = !validationResult ? validateAndSetResult(newValue) : validationResult;
        if (!curValidationResult.isInvalid) {
            props.buttonOptions.onSubmit(newValue);
            clearResult();
            setValue('');
            if (props.onSuccess) props.onSuccess();
        }
    };

    const handleChange = (value: string) => {
        setValue(value);
        validateAndSetResult(value);
    };

    return (
        <props.fieldComponent
            {...props}
            value={value}
            validationResult={validationResult}
            buttonOptions={{ buttonType: props.buttonOptions.buttonType, onSubmit: handleSubmit }}
            onChangeValue={handleChange}
        >
            {props.children}
        </props.fieldComponent>
    );
}

interface EditToggleFieldProps extends SingleInputFieldProps {
    value: string;
    initialState: boolean;
    children: React.ReactNode;
}

// Wrapper for input fields that can be expanded or hidden with an Edit button
export const EditToggleField: React.FC<EditToggleFieldProps> = (props) => {
    const [editing, setEditing] = useState(props.initialState);
    const [initFocus, setInitFocus] = useState(!props.initialState);

    const toggleEditMode = () => {
        setEditing(!editing);
        setInitFocus(true);
    }

    const contents = (editing && !props.disabled)
        ? <SingleInputField {...props} initFocus={initFocus} onSuccess={toggleEditMode}>{props.children}</SingleInputField>
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

export interface DialogState {
    show: boolean;
    onClose?: () => void;
    title?: string;
    description?: string;
    action?: () => void;
}

interface DialogProps extends DialogState {}

export const Dialog = (props: DialogProps) => {
    const { show, onClose, title, description, action } = props;

    return (
        <Modal
            show={show}
            onHide={onClose}
            //centered
        >
            {(
                props.title !== undefined &&
                props.description !== undefined &&
                props.action !== undefined
            ) && (
                <>
                <Modal.Header closeButton>
                    <Modal.Title>{title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>{description}</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={action} variant='primary'>OK</Button>
                    <Button onClick={props.onClose} variant='outline-dark'>Cancel</Button>
                </Modal.Footer>
                </>
            )}
        </Modal>
    );
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
    queues: readonly QueueBase[];
    manageLink?: boolean | undefined;
}

export function QueueTable (props: QueueTableProps) {
    const linkBase = props.manageLink ? '/manage/' : '/queue/'

    const sortedQueues = sortQueues(props.queues.slice());
    const queueItems = sortedQueues.map(q => (
        <tr key={q.id}>
            <td aria-label={`Queue ID Number`}>
                <Link to={`${linkBase}${q.id}`}>
                    <Badge bg='primary' pill={true}>{q.id}</Badge>
                </Link>
            </td>
            <td aria-label={`Name for Queue ID ${q.id}`}>
                <Link to={`${linkBase}${q.id}`}>{q.name}</Link>
            </td>
            <td aria-label={`Status for Queue ID ${q.id}`}>
                <Link to={`${linkBase}${q.id}`}>
                    <Badge bg={q.status === 'open' ? 'success' : 'danger'} pill={true}>
                        {q.status}
                    </Badge>
                </Link>
            </td>
        </tr>
    ));
    return (
        <Table bordered hover aria-label='Queue Table with Links' className='queue-table'>
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

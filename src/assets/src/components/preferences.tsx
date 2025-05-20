import * as React from "react";
import { useState, useEffect } from "react";
import { Alert, Button, Form, FormGroup } from "react-bootstrap";
import PhoneInput from "react-phone-input-2";
import 'react-phone-input-2/lib/bootstrap.css'

import * as api from "../services/api";
import { MyUser } from "../models";
import { ErrorDisplay, FormError, checkForbiddenError, LoadingDisplay, LoginDialog, Breadcrumbs } from "./common";
import { usePromise } from "../hooks/usePromise";
import { redirectToLogin } from "../utils";
import { PageProps } from "./page";
import { validatePhoneNumber } from "../validation";
import { PhoneVerification } from "./PhoneVerification";

interface PhoneStatusAlertProps {
    user: MyUser;
    onGetOneTimePassword: (phoneNumberToSubmit: string) => Promise<unknown>;
}

function PhoneStatusAlert(props: PhoneStatusAlertProps) {
    const { user, onGetOneTimePassword } = props;
    
    if (user.phone_number_status !== 'NEEDS_VERIFICATION') {
        return null;
    }

    const handleVerifyClick = () => {
        if (user.phone_number) {
            onGetOneTimePassword(user.phone_number);
        }
    };

    return (
        <Alert variant="warning" className="mb-3">
            <Alert.Heading>Your phone number needs verification</Alert.Heading>
            <p>
                We encountered an issue sending messages to your phone number
                {user.twilio_error_message ? `: ${user.twilio_error_message}` : ""}.
                Please verify your phone number again to receive notifications.
            </p>
            <Button variant="primary" onClick={handleVerifyClick}>
                Verify Phone Number
            </Button>
        </Alert>
    );
}

interface PreferencesEditorProps {
    user: MyUser;
    disabled: boolean;
    onUpdateInfo: (phoneNumber: string, notifyMeAttendee: boolean, notifyMeHost: boolean) => void;
    onGetOneTimePassword: (phoneNumberToSubmit: string) => Promise<unknown>;
    onVerifyOneTimePassword: (otp: string) => Promise<unknown>;
    otpRequestBuffer: number;
    errorOccurred: boolean;
}

export enum FormStatus {
    NotSubmitted,
    ValidationErrors,
    Success,
    SubmissionError
}

function PreferencesEditor(props: PreferencesEditorProps) {
    const [phoneField, setPhoneField] = useState(props.user.phone_number);
    const [countryDialCode, setCountryDialCode] = useState(props.user.phone_number !== "" ? props.user.phone_number.substring(0, 1) :"");
    const [notifyMeAttendee, setNotifyMeAttendee] = useState(props.user.notify_me_attendee);
    const [notifyMeHost, setNotifyMeHost] = useState(props.user.notify_me_host);
    const [formStatus, setFormStatus] = useState(FormStatus.NotSubmitted);
    const [validationErrors, setValidationErrors] = useState([] as Error[]);

    useEffect(() => {
        if (validationErrors.length) setFormStatus(FormStatus.ValidationErrors)
    }, [validationErrors])

    const phoneNumberToSubmit = (phoneField.length <= countryDialCode.length) ? "" : phoneField;
    const changedPhoneNumber = props.user.phone_number !== phoneNumberToSubmit;

    const notifyMeAttendeeInput = (
        <Form.Check 
            type="checkbox"
            id="notify-me-attendee"
            className="mt-3"
            disabled={props.disabled}
            checked={notifyMeAttendee}
            onChange={() => setNotifyMeAttendee(!notifyMeAttendee)}
            label="As an attendee, I want to be notified via SMS when it becomes my turn." />
    );
    const notifyMeHostInput = (
        <Form.Check 
            type="checkbox"
            id="notify-me-host"
            className="mt-2"
            disabled={props.disabled}
            checked={notifyMeHost}
            onChange={() => setNotifyMeHost(!notifyMeHost)}
            label="As a host, I want to be notified via SMS when someone joins my empty queue." />
    );

    const validateAndSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault() // Prevent page reload
        const phoneValidationErrors = phoneNumberToSubmit
            ? validatePhoneNumber(phoneField, countryDialCode)
            : [];
        const optInValidationErrors = [
            (notifyMeAttendee && !phoneNumberToSubmit)
                && new Error("You must enter a phone number to opt in to attendee SMS notifications."),
            (notifyMeHost && !phoneNumberToSubmit)
                && new Error("You must enter a phone number to opt in to host SMS notifications."),
        ].filter(e => e) as Error[];
        const otpValidationErrors = [
            (changedPhoneNumber && phoneNumberToSubmit !== "") 
                && new Error("Please validate your new phone number before saving your preferences.")
        ].filter(e => e) as Error[];
        const validationErrors = [...phoneValidationErrors, ...optInValidationErrors, ...otpValidationErrors];
        setValidationErrors(validationErrors);
        if (!validationErrors.length) {
            props.onUpdateInfo(phoneNumberToSubmit, notifyMeAttendee, notifyMeHost);
            setFormStatus(FormStatus.Success);
        }
    }
    
    const clearAll = () => {
        setPhoneField(countryDialCode);
        setNotifyMeAttendee(false);
        setNotifyMeHost(false);
        setFormStatus(FormStatus.NotSubmitted);
        setValidationErrors([]);
    }

    const alertBlock = (() => {
        switch (formStatus) {
            case FormStatus.NotSubmitted:
                return undefined;
            case FormStatus.ValidationErrors:
                return (
                    <Alert variant='danger'>
                        <ul className="mb-0">
                            {validationErrors.map((e, i) => <li key={i}>{e.message}</li>)}
                        </ul>
                    </Alert>
                );
            case FormStatus.Success:
                return <Alert variant='success'>Your preferences were successfully updated.</Alert>;
            case FormStatus.SubmissionError:
                return <Alert variant='danger'>An error occurred while trying to update your preferences; please try again later.</Alert>;
        }
    })();

    return (
        <div>
            <h1>View/Update Preferences</h1>
            <PhoneStatusAlert user={props.user} onGetOneTimePassword={props.onGetOneTimePassword} />
            {alertBlock}
            <Form onSubmit={validateAndSubmit}>
                <p>Enter a phone number in order to opt in to SMS notifications.</p>
                <FormGroup controlId='phone' className="mb-3">
                    <Form.Label>Phone Number</Form.Label>
                    {
                    <PhoneVerification
                        phoneField={phoneField}
                        setPhoneField={setPhoneField}
                        countryDialCode={countryDialCode}
                        setCountryDialCode={setCountryDialCode}
                        onGetOneTimePassword={props.onGetOneTimePassword}
                        onVerifyOneTimePassword={props.onVerifyOneTimePassword}
                        otpRequestBuffer={props.otpRequestBuffer}
                        verifiedPhoneNumber={props.user.phone_number}
                        setValidationErrors={setValidationErrors}
                        disabled={props.disabled}
                        setFormStatus={setFormStatus}
                    />
                    }
                    {notifyMeAttendeeInput}
                    {notifyMeHostInput}
                </FormGroup>
                <Button variant="secondary" className="mb-3" onClick={clearAll} disabled={props.disabled}>Clear All</Button>
                <br/>
                <Button variant="primary" type="submit" disabled={props.disabled}>Save Changes</Button>

            </Form>
        </div>
    );
}
export function PreferencesPage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }
    
    if (!props.user) throw new Error("user is undefined!");
    const userId = props.user.id
    // Setup basic state
    const [user, setUser] = useState(undefined as MyUser | undefined);
    const [doRefresh, refreshLoading, refreshError] = usePromise(() => api.getUser(userId) as Promise<MyUser>, setUser);
    useEffect(() => {
        doRefresh();
    }, []);

    // Setup interactions
    const [doUpdateInfo, updateInfoLoading, updateInfoError] = usePromise(
        (phoneNumber, notifyMeAttendee, notifyMeHost) =>
            api.updateUser(userId, phoneNumber, notifyMeAttendee, notifyMeHost) as Promise<MyUser>, setUser
    );
    const doGetOneTimePassword = async (phoneNumberToSubmit: string) => api.getOneTimePassword(userId, phoneNumberToSubmit) as Promise<unknown>
    const doVerifyOneTimePassword = async (otp: string) => {
        const resp = await api.verifyOneTimePassword(userId, otp) as Promise<unknown>; 
        await doRefresh(); 
        return resp;
    }

    // Render
    const isChanging = updateInfoLoading;
    const isLoading = isChanging;
    const errorSources = [
        {source: 'Update Preferences', error: updateInfoError},
        {source: 'Load User', error: refreshError},
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = errorSources.some(checkForbiddenError);
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay formErrors={errorSources}/>
    const preferencesEditor = user
        && (
            <PreferencesEditor
                user={user}
                disabled={isChanging}
                onUpdateInfo={doUpdateInfo}
                onGetOneTimePassword={doGetOneTimePassword}
                onVerifyOneTimePassword={doVerifyOneTimePassword}
                otpRequestBuffer={props.otpRequestBuffer}
                errorOccurred={!!errorSources.length}
            />
        );
    return (
        <>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <Breadcrumbs currentPageTitle='User Preferences' />
            {errorDisplay}
            {loadingDisplay}
            {preferencesEditor}
        </>
    );
}
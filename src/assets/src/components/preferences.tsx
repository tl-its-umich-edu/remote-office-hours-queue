import * as React from "react";
import { useState, useEffect } from "react";
import { Alert, Button, Form, FormGroup } from "react-bootstrap";
import PhoneInput from "react-phone-input-2";
import Spinner from "react-bootstrap/Spinner";
import 'react-phone-input-2/lib/bootstrap.css'

import * as api from "../services/api";
import { MyUser } from "../models";
import { ErrorDisplay, FormError, checkForbiddenError, LoadingDisplay, LoginDialog, Breadcrumbs } from "./common";
import { usePromise } from "../hooks/usePromise";
import { redirectToLogin } from "../utils";
import { PageProps } from "./page";
import { validatePhoneNumber } from "../validation";

interface PreferencesEditorProps {
    user: MyUser;
    disabled: boolean;
    onUpdateNotificationInfo: (notifyMeAttendee: boolean, notifyMeHost: boolean) => void;
    onGetOneTimePassword: (phoneNumberToSubmit: string) => Promise<unknown>;
    onVerifyOneTimePassword: (otp: string) => Promise<unknown>;
    errorOccurred: boolean;
}

type ValidationStatus = null | Error[]; // null = no changes, [] = valid

function PreferencesEditor(props: PreferencesEditorProps) {
    const [phoneField, setPhoneField] = useState(props.user.phone_number);
    const [phoneUpdateStatus, setPhoneUpdateStatus] = useState("");
    const [timeToResendCode, setTimeToResendCode] = useState(0);
    const [otpValue, setOtpValue] = useState("");
    const [sendingCode, setSendingCode] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [countryDialCode, setCountryDialCode] = useState("");
    const [notifyMeAttendee, setNotifyMeAttendee] = useState(props.user.notify_me_attendee);
    const [notifyMeHost, setNotifyMeHost] = useState(props.user.notify_me_host);
    const [validationStatus, setValidationStatus] = useState(undefined as undefined | ValidationStatus);

    const phoneNumberToSubmit = (phoneField.length <= countryDialCode.length) ? "" : phoneField;
    const formattedPhoneNumberToSubmit = phoneNumberToSubmit.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, "+$1 ($2) $3-$4");
    const changedPhoneNumber = props.user.phone_number !== phoneNumberToSubmit;
    const changedNotificationSettings = props.user.notify_me_attendee !== notifyMeAttendee
        || props.user.notify_me_host !== notifyMeHost;

    const phoneInput = (
        <PhoneInput
            country={'us'}
            onlyCountries={['us', 'ca']}
            countryCodeEditable={false}
            value={props.user.phone_number}
            onChange={(value: any, data: any) => {
                setPhoneField(value);
                if ('dialCode' in data) setCountryDialCode(data.dialCode);
            }}
            disabled={props.disabled || sendingCode}
            inputProps={{ id: 'phone' }}
            placeholder=""
        />
    );
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

    const oneTimePasswordTimer = () => {
        let timer = process.env.REACT_APP_OTP_TIMER ? parseInt(process.env.REACT_APP_OTP_TIMER) : 30;
        const interval = setInterval(() => {
            setTimeToResendCode(timer--);
            if (timer === -1) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }

    const getOneTimePassword = async (e: React.SyntheticEvent) => {
        e.preventDefault(); // Prevent page reload
        if (sendingCode || verifying) return;
        setSendingCode(true);

        // check if time buffer has passed, phone number has changed, 
        // and phone number is valid
        const timeRemaining = timeToResendCode ?
            [new Error(`You must wait ${timeToResendCode} more seconds before requesting a new verification code.`)]
            : [];
        const phoneChangedError = !changedPhoneNumber ?
            [new Error("You must enter a new phone number to receive a verification code.")]
            : [];
        const phoneValidationErrors = validatePhoneNumber(phoneNumberToSubmit, countryDialCode);
        const errors = [...timeRemaining, ...phoneChangedError, ...phoneValidationErrors];

        if (errors.length) {
            setValidationStatus(errors);
            setSendingCode(false);
            return;
        }

        setValidationStatus(undefined);
        oneTimePasswordTimer(); // start timer to resend code

        try {
            await props.onGetOneTimePassword(phoneNumberToSubmit); // send otp & save in db
            setPhoneUpdateStatus("verify"); // move to verification step
        }
        catch (error: any) {
            setValidationStatus([error]); // display error
        }
        setSendingCode(false);
    }

    const verifyOneTimePassword = async (e: React.SyntheticEvent) => {
        e.preventDefault(); // Prevent page reload
        if (sendingCode || verifying) return;
        setVerifying(true);

        if (otpValue.length !== 4) {
            setValidationStatus([new Error("You must enter a 4-digit verification code.")]);
            setVerifying(false);
            return;
        }
        setValidationStatus(undefined);

        try {
            await props.onVerifyOneTimePassword(otpValue);
            setPhoneField(phoneNumberToSubmit); // update phone form field
            setPhoneUpdateStatus(""); // reset to phone input
            setValidationStatus([])
        }
        catch (error: any) {
            console.log(error)
            setValidationStatus([error]);
        }
        setVerifying(false);
    }

    const validateAndSubmitNotification = (e: React.SyntheticEvent) => {
        e.preventDefault() // Prevent page reload
        if (!changedNotificationSettings) {
            setValidationStatus(null);
            return;
        }
        const optInValidationErrors = [
            (notifyMeAttendee && props.user.phone_number === "")
            && new Error("You must enter a phone number to opt in to attendee SMS notifications."),
            (notifyMeHost && props.user.phone_number === "")
            && new Error("You must enter a phone number to opt in to host SMS notifications."),
        ].filter(e => e) as Error[];
        setValidationStatus(optInValidationErrors);
        if (!optInValidationErrors.length)
            props.onUpdateNotificationInfo(notifyMeAttendee, notifyMeHost);
    }

    const alertBlock =
        validationStatus === undefined // not yet validated
            ? undefined
        : validationStatus === null
            ? <Alert variant='primary'>Your preferences were not changed.</Alert>
        : validationStatus.length
            ? (
                <Alert variant='danger'>
                    <ul className="mb-0">
                        {validationStatus.map((e, i) => <li key={i}>{e.message}</li>)}
                    </ul>
                </Alert>
            )
        : props.errorOccurred
            ? <Alert variant='danger'>An error occurred while trying to update your preferences; please try again later.</Alert>
        : <Alert variant='success'>Your preferences were successfully updated.</Alert>

    return (
        <div>
            <h1>View/Update Preferences</h1>
            {alertBlock}
            <h2>Contact Information</h2>
            {phoneUpdateStatus === "" &&
                <Form>
                    <p>Enter a phone number in order to opt in to SMS notifications.</p>
                    <FormGroup controlId='phone' className="mb-3">
                        <Form.Label>Phone Number</Form.Label>
                        {phoneInput}
                    </FormGroup>
                    {!sendingCode ? <Button variant="secondary" type="submit" disabled={props.disabled} onClick={getOneTimePassword}>Get Verification Code</Button>
                        : <Button variant="secondary"><Spinner animation="border" size="sm" as="span" role="status" /> Sending...</Button>}
                </Form>
            }
            {phoneUpdateStatus === "verify" &&
                <Form>
                    <p>Enter the verification code sent to {formattedPhoneNumberToSubmit} (<a onClick={() => setPhoneUpdateStatus("")}
                        className="link-primary">edit</a>)</p>
                    <FormGroup controlId='otp' className="mb-3">
                        <Form.Control type="number" value={otpValue}
                            onKeyDown={(e) => { ["e", "E", "+", "-"].includes(e.key) && e.preventDefault() }}
                            onChange={(e) => { if (e.target.value.length <= 4) setOtpValue(e.target.value) }}
                            disabled={props.disabled}
                            className="w-25" required></Form.Control>
                    </FormGroup>
                    {!verifying ?
                        <Button variant="secondary" type="submit" disabled={props.disabled || sendingCode} onClick={verifyOneTimePassword}>Verify</Button>
                        : <Button variant="secondary"><Spinner animation="border" size="sm" as="span" role="status" /> Verifying...</Button>
                    }
                    {!sendingCode ?
                        <p className="mt-2">Didn't receive a code?&nbsp;
                            {timeToResendCode ? <a className="link-secondary">Resend Code in {timeToResendCode}s</a>
                                : <a onClick={getOneTimePassword} className={!verifying ? "link-primary" : "link-secondary"}>Resend Code</a>
                            }
                        </p>
                        : <p className="mt-2"><Spinner animation="border" size="sm" as="span" role="status" /> Sending...</p>
                    }
                </Form>
            }
            <h2>Notification Settings</h2>
            <Form onSubmit={validateAndSubmitNotification}>
                <FormGroup controlId='notification-settings' className="mb-3">
                    {notifyMeAttendeeInput}
                    {notifyMeHostInput}
                </FormGroup>
                <Button variant="primary" type="submit" disabled={props.disabled}>Save</Button>
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
    const [doUpdateNotificationInfo, updateInfoLoading, updateInfoError] = usePromise(
        (notifyMeAttendee, notifyMeHost) =>
            api.updateUserNotificationInfo(userId, notifyMeAttendee, notifyMeHost) as Promise<MyUser>, setUser
    );
    const doGetOneTimePassword = (phoneNumberToSubmit: string) => {return api.getOneTimePassword(userId, phoneNumberToSubmit) as Promise<unknown> }
    const doVerifyOneTimePassword = (otp: string) => {const resp = api.verifyOneTimePassword(userId, otp) as Promise<unknown>; doRefresh(); return resp;}
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
                onUpdateNotificationInfo={doUpdateNotificationInfo}
                onGetOneTimePassword={doGetOneTimePassword}
                onVerifyOneTimePassword={doVerifyOneTimePassword}
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

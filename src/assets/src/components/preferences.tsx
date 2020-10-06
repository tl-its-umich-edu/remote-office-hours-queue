import * as React from "react";
import { useState, useEffect } from "react";
import { Alert, Button, Form } from "react-bootstrap";
import PhoneInput from "react-phone-input-2";
import 'react-phone-input-2/lib/style.css'

import * as api from "../services/api";
import { User } from "../models";
import { ErrorDisplay, FormError, checkForbiddenError, LoadingDisplay, LoginDialog, Breadcrumbs } from "./common";
import { usePromise } from "../hooks/usePromise";
import { redirectToLogin } from "../utils";
import { PageProps } from "./page";

interface PreferencesEditorProps {
    user: User;
    disabled: boolean;
    onUpdateInfo: (phoneNumber: string) => void;
    errorOccurred: boolean;
}

function PreferencesEditor(props: PreferencesEditorProps) {
    const [phoneField, setPhoneField] = useState(props.user.phone_number);
    const [countryDialCode, setCountryDialCode] = useState("");
    const [phoneIsValid, setPhoneIsValid] = useState(undefined as undefined | null | boolean)
    const [phoneValidationError, setPhoneValidationError] = useState(undefined as undefined | string)

    const phoneInput = (
        <PhoneInput
            country={'us'}
            value={props.user.phone_number}
            onChange={(value: any, data: any) => {
                setPhoneField(value);
                if ('dialCode' in data) setCountryDialCode(data.dialCode);
            }}
            disabled={props.disabled}
            inputProps={{id: 'phone'}}
        />
    )
    const validateAndSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault() // Prevent page reload
        // Determine if there was a change that warrants a submit
        const num = props.user.phone_number;
        let validCheck = null as boolean | null
        let validationError = undefined as undefined | string
        if (
            (num.length === 0 && phoneField.length > countryDialCode.length) ||
            (num.length > 0 && phoneField !== num && phoneField.length > 1)
        ) {
            // If USA number, ensure it's 11 digits to submit 
            if (countryDialCode === '1') {
                if (phoneField.length == 11) {
                    validCheck = true
                    props.onUpdateInfo(phoneField)
                } else {
                    validCheck = false
                    validationError = 'The phone number entered was invalid; USA phone numbers must have 11 digits.'
                }
            } else {
                validCheck = true
                props.onUpdateInfo(phoneField)
            }
        } else if (phoneField.length <= 1 && num !== '') {
            // Update phone number to be empty if they try to delete everything in the phone field
            // Seems to be a known issue where the last character can't be removed as part of onChange:
            // https://github.com/bl00mber/react-phone-input-2/issues/231
            validCheck = true
            props.onUpdateInfo('')
        }

        setPhoneIsValid(validCheck)
        if (validCheck === false) {
            setPhoneValidationError(validationError)
        }
    }

    let alertBlock
    if (phoneIsValid === false) {
        alertBlock = <Alert variant='danger'>{phoneValidationError ? phoneValidationError : 'One or more of your entries is invalid.'}</Alert>
    } else if (phoneIsValid === null) {
        alertBlock = <Alert variant='primary'>Your preferences were not changed.</Alert>
    } else if (phoneIsValid === true && props.errorOccurred) {
        alertBlock = <Alert variant='danger'>An error occurred while trying to update your preferences; please try again later.</Alert>
    } else if (phoneIsValid === true) {
        // props.errorOccurred === false is implied
        alertBlock = <Alert variant='success'>Your preferences were successfully updated.</Alert>
    }
    // if alertBlock is still undefined, don't display an Alert

    return (
        <div>
            <h1>View/Update Preferences</h1>
            {alertBlock}
            <Form onSubmit={validateAndSubmit}>
                <p>Please provide alternate means by which the host may contact you in the event of technical difficulties.</p>
                <Form.Group controlId='phone'>
                    <Form.Label>Phone Number</Form.Label>
                    {phoneInput}
                </Form.Group>
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
    const [user, setUser] = useState(undefined as User | undefined);
    const [doRefresh, refreshLoading, refreshError] = usePromise(() => api.getUser(userId) as Promise<User>, setUser);
    useEffect(() => {
        doRefresh();
    }, []);

    // Setup interactions
    const [doUpdateInfo, updateInfoLoading, updateInfoError] = usePromise(
        (phoneNumber: string) => api.updateProfile(userId, phoneNumber) as Promise<User>, setUser
    );

    // Render
    const isChanging = updateInfoLoading;
    const isLoading = isChanging;
    const errorSources = [
        {source: 'Update Preferences', error: updateInfoError}
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
                errorOccurred={(errorSources.length > 0) ? true : false}
            />
        )
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

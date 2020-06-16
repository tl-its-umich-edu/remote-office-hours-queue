import * as React from "react";
import { useState, useEffect } from "react";
import PhoneInput from "react-phone-input-2";
import 'react-phone-input-2/lib/style.css'

import * as api from "../services/api";
import { User } from "../models";
import { ErrorDisplay, LoadingDisplay, LoginDialog, Breadcrumbs } from "./common";
import { usePromise } from "../hooks/usePromise";
import { redirectToLogin } from "../utils";
import { PageProps } from "./page";

interface PreferencesEditorProps {
    user: User;
    disabled: boolean;
    onUpdateInfo: (phoneNumber: string) => void;
}

function PreferencesEditor(props: PreferencesEditorProps) {
    var currentPhoneField = ""
    const setPhoneField = (newNumber: string) => {
        currentPhoneField = newNumber
    };
    
    const phoneInput = <PhoneInput
        country={'us'}
        value={props.user.phone_number}
        onChange={setPhoneField}
        disabled={props.disabled}
    />
    
    return (
        <div>
            <h1>View/Update Preferences</h1>
            <p>
                Please provide alternate means by which the host may contact you in the event of technical difficulties.
            </p>
            Phone Number:
            {phoneInput}
            <button className="btn btn-primary" onClick={() => props.onUpdateInfo(currentPhoneField)}>
                Save
            </button>
        </div>
    );
}

export function PreferencesPage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }
    
    if (!props.user) throw new Error("user is undefined!");
    const userId = props.user.id

    //Setup basic state
    const [user, setUser] = useState(undefined as User | undefined);
    const [doRefresh, refreshLoading, refreshError] = usePromise(() => api.getMyUser(userId) as Promise<User>, setUser);
    useEffect(() => {
        doRefresh();
    }, []);

    //Setup interactions
    const updateInfo = async (phoneNumber: string) => {
         
        return await api.updateMyUser(userId, phoneNumber)
        
    }
    const [doUpdateInfo, updateInfoLoading, updateInfoError] = usePromise((phoneNumber: string) => api.updateMyUser(userId, phoneNumber) as Promise<User>, setUser);

    //Render
    const isChanging = updateInfoLoading;
    const isLoading = isChanging;
    const errorTypes = [updateInfoError];
    const error = errorTypes.find(e => e);
    const loginDialogVisible = errorTypes.some(e => e?.name === "ForbiddenError");
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay error={error}/>
    const preferencesEditor = user
        && <PreferencesEditor user={user} disabled={isChanging} onUpdateInfo={doUpdateInfo}/>
    return (
        <>
        <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
        <Breadcrumbs
            currentPageTitle="User Preferences" />
        {loadingDisplay}
        {errorDisplay}
        {preferencesEditor}
        </>
    );
}

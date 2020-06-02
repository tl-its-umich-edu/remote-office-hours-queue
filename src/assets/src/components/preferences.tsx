import * as React from "react";
import { useState, useEffect } from "react";

import * as api from "../services/api";
import { User } from "../models";
import { ErrorDisplay, LoadingDisplay, EditToggleField, LoginDialog, Breadcrumbs } from "./common";
import { usePromise } from "../hooks/usePromise";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { redirectToLogin } from "../utils";
import { PageProps } from "./page";

interface PreferencesEditorProps {
    user: User;
    disabled: boolean;
    onUpdateInfo: (phone_number: string) => void;
}

function PreferencesEditor(props: PreferencesEditorProps) {

    return (
        <div>
            <h1>View/Update Preferences</h1>
            <p>
                Please provide alternate means in which the host may contact you in the event of technical difficulties.
            </p>
            Phone Number:<EditToggleField text={props.user.phone_number} disabled={props.disabled} id="phone_number"
            onSubmit={props.onUpdateInfo} buttonType="success" placeholder="">
                Update
            </EditToggleField>
        </div>
    );
}

export function PreferencesPage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }
    
    if (!props.user) throw new Error("user is undefined!");
    const user_id = props.user?.id

    //Setup basic state
    const [user, setUser] = useState(undefined as User | undefined);
    const [doRefresh, refreshLoading, refreshError] = usePromise(() => api.getMyUser(user_id) as Promise<User>, setUser);
    useEffect(() => {
        doRefresh();
    }, []);
    const [interactions] = useAutoRefresh(doRefresh);

    //Setup interactions
    const updateInfo = async (phone_number: string) => {
        interactions.next(true);
        await api.updateMyUser(user_id, phone_number)
        await doRefresh();
    }
    const [doUpdateInfo, updateInfoLoading, updateInfoError] = usePromise(updateInfo);

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

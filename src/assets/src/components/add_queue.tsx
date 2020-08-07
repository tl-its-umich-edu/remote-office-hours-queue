import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import * as api from "../services/api";
import { ErrorDisplay, FormError, checkForbiddenError, LoadingDisplay, SingleInputForm, LoginDialog, Breadcrumbs } from "./common";
import { usePromise } from "../hooks/usePromise";
import { redirectToLogin } from "../utils";
import { PageProps } from "./page";

interface AddQueueEditorProps {
    disabled: boolean,
    isGeneralTab: boolean,
    onAddQueue: () => Promise<void>;
    onChangeTab: (isGeneral: boolean) => void;
}

function General(props: AddQueueEditorProps) {

    return (
        <>
        <h2>General</h2>
        </>
    );
}

function ManageHosts(props: AddQueueEditorProps) {

    return (
        <>
        <h2>Manage Hosts</h2>
        </>
    );
}

function AddQueueEditor(props: AddQueueEditorProps) {
    const generalTab = props.isGeneralTab?<button className="h3"><strong>General</strong></button>:<button className="h3">General</button>
    const manageTab = !props.isGeneralTab?<button className="h3"><strong>Manage Hosts</strong></button>:<button className="h3">Manage Hosts</button>
    const content = props.isGeneralTab
    ? <General {...props}/>
    : <ManageHosts {...props}/>
    return (
        <>
        <div className="row">
            <div className="col-sm">
                {generalTab}
                {manageTab}
            </div>
            <div className="col-lg">
                {content}
            </div>
        </div>
        </>
    );
}

export function AddQueuePage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }
    //Setup basic state
    const [isGeneralTab, setIsGeneralTab] = useState(true);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [blueJeansAllowed, setBluejeansAllowed] = useState(true);
    const [inpersonAllowed, setInpersonAllowed] = useState(false);
    const [hosts, setHosts] = useState([props.user!.username]);

    //Setup interactions
    const addQueue = async () => {
        if (!name) {
            throw new Error("Queue name is required.")
        }
    }
    const [doAddQueue, addQueueLoading, addQueueError] = usePromise(addQueue);
    const isChanging = addQueueLoading;
    const errorSources = [
        {source: 'Add Queue', error: addQueueError}
    ].filter(e => e.error) as FormError[];
    const loginDialogVisible = errorSources.some(checkForbiddenError);
    const errorDisplay = <ErrorDisplay formErrors={errorSources}/>
    const addQueueEditor = <AddQueueEditor disabled={isChanging} isGeneralTab={isGeneralTab}
        onAddQueue={doAddQueue} onChangeTab={setIsGeneralTab}/>
    return (
        <div>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <Breadcrumbs currentPageTitle="Add Queue"/>
            {errorDisplay}
            <h1>Add Queue</h1>
            {addQueueEditor}
            <hr/>
            
        </div>
    );
}
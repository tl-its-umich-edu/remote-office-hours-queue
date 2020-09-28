import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Col, Nav, Row, Tab } from "react-bootstrap";

import { Breadcrumbs, checkForbiddenError, ErrorDisplay, FormError, LoadingDisplay, LoginDialog } from "./common";
import { PageProps } from "./page";
import { AllowedBackendsForm } from "./meetingType";
import { usePromise } from "../hooks/usePromise";
import * as api from "../services/api";
import { redirectToLogin } from "../utils";

interface AddQueueEditorProps {
    backends: {[backend_type: string]: string};
    allowedMeetingTypes: Set<string>;
    onChangeAllowed: (allowed: Set<string>) => void;
    disabled: boolean;
    onAddQueue: () => Promise<void>;
    onChangeTab?: (isGeneral: boolean) => void;
}

function General(props: AddQueueEditorProps) {
    return (
        <div>
            <h2>General</h2>
            <h3>Title</h3>
            <h3>Description</h3>
            <h3>Meeting Types</h3>
            <AllowedBackendsForm
                allowed={props.allowedMeetingTypes}
                backends={props.backends}
                onChange={props.onChangeAllowed}
                disabled={props.disabled}
            />
        </div>
    );
}

function ManageHosts(props: AddQueueEditorProps) {
    return (
        <div>
            <h2>Manage Hosts</h2>
            <h3>Add Hosts</h3>
            <h3>Remove Hosts</h3>
        </div>
    );
}

// https://react-bootstrap.github.io/components/tabs/#tabs-custom-layout
function AddQueueEditor(props: AddQueueEditorProps) {
    return (
        <Tab.Container id='add-queue-editor' defaultActiveKey='general'>
            <Row>
                <Col sm={3}>
                    <Nav variant='pills' className='flex-column'>
                        <Nav.Item><Nav.Link eventKey='general'>General</Nav.Link></Nav.Item>
                        <Nav.Item><Nav.Link eventKey='hosts'>Manage Hosts</Nav.Link></Nav.Item>
                    </Nav>
                </Col>
                <Col sm={9}>
                    <h1>Add Queue</h1>
                    <Tab.Content>
                        <Tab.Pane eventKey="general">
                            <General {...props}/>
                        </Tab.Pane>
                        <Tab.Pane eventKey="hosts">
                            <ManageHosts {...props}/>
                        </Tab.Pane>
                    </Tab.Content>
                </Col>
            </Row>
        </Tab.Container>
    );
}


export function AddQueuePage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }
    //Setup basic state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [allowedMeetingTypes, setAllowedMeetingTypes] = useState(new Set() as Set<string>)
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
    const addQueueEditor = (
        <AddQueueEditor
            allowedMeetingTypes={allowedMeetingTypes}
            backends={props.backends}
            onChangeAllowed={setAllowedMeetingTypes}
            onAddQueue={doAddQueue}
            disabled={isChanging}
        />
    );
    return (
        <div>
            <LoginDialog visible={loginDialogVisible} loginUrl={props.loginUrl} />
            <Breadcrumbs currentPageTitle="Add Queue"/>
            {errorDisplay}
            {addQueueEditor}
        </div>
    );
}
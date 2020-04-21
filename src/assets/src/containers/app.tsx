import * as React from "react";
import { createRef } from "react";
import { Route, withRouter } from 'react-router-dom'
import { RouteComponentProps } from 'react-router'
import Dialog from "react-bootstrap-dialog";

import { Globals } from "..";
import { HomePage } from "../components/home";
import { ManagePage } from "../components/manage";
import { QueuePage } from "../components/queue";
import { QueueEditorPage } from "../components/edit";
import { SearchPage } from "../components/search";
import { useGoogleAnalytics } from "../hooks/useGoogleAnalytics";

interface AppProps extends RouteComponentProps {
    globals: Globals;
}

function App(props: AppProps) {
    useGoogleAnalytics(props.globals.ga_tracking_id, props.globals.debug);
    const loginModalRef = createRef<Dialog>();
    const triggerLoginModal = () => {
        loginModalRef.current!.show({
            title: "Log In",
            body: (
                <div>
                    <p className="alert alert-warning">Your session has timed out. Please login via the form below, then click OK.</p>
                    <iframe title="Log In" src="/oidc/authenticate" width="100%" height="100%"></iframe>
                </div>
            ),
            actions: [
                Dialog.OKAction(),
            ],
            bsSize: "lg",
        });
    }
    return (
        <>
            <Dialog ref={loginModalRef} />
            <Route path='/' exact render={p => 
                <HomePage {...p} user={props.globals.user} triggerLoginModal={triggerLoginModal} />
            }/>
            <Route path='/manage' exact render={p => 
                <ManagePage {...p} user={props.globals.user} triggerLoginModal={triggerLoginModal} />
            }/>
            <Route path='/manage/:queue_id' exact render={p => 
                <QueueEditorPage {...p} user={props.globals.user} triggerLoginModal={triggerLoginModal} key={(p.match.params as any).queue_id} />
            }/>
            <Route path='/queue/:queue_id' exact render={p => 
                <QueuePage {...p} user={props.globals.user} triggerLoginModal={triggerLoginModal} key={(p.match.params as any).queue_id} />
            }/>
            <Route path='/search/:term' exact render={p =>
                <SearchPage {...p} user={props.globals.user} triggerLoginModal={triggerLoginModal} />
            }/>
        </>
    );
}

export const AppRouter = withRouter(App)

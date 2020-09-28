import * as React from "react";
import { createRef } from "react";
import { Route, withRouter } from 'react-router-dom'
import { RouteComponentProps, Switch } from 'react-router'
import Dialog from "react-bootstrap-dialog";

import { Globals } from "..";
import { HomePage } from "../components/home";
import { ManagePage } from "../components/manage";
import { QueuePage } from "../components/queue";
import { QueueEditorPage } from "../components/edit";
import { SearchPage } from "../components/search";
import { AddQueuePage } from "../components/addQueue";
import { useGoogleAnalytics } from "../hooks/useGoogleAnalytics";

interface AppProps extends RouteComponentProps {
    globals: Globals;
}

function App(props: AppProps) {
    useGoogleAnalytics(props.globals.ga_tracking_id, props.globals.debug);
    return (
        <Switch>
            <Route path='/' exact render={p => 
                <HomePage {...p} user={props.globals.user} loginUrl={props.globals.login_url} backends={props.globals.backends} defaultBackend={props.globals.default_backend} />
            }/>
            <Route path='/manage' exact render={p => 
                <ManagePage {...p} user={props.globals.user} loginUrl={props.globals.login_url} backends={props.globals.backends} defaultBackend={props.globals.default_backend} />
            }/>
            <Route path='/manage/:queue_id' exact render={p => 
                <QueueEditorPage {...p} user={props.globals.user} loginUrl={props.globals.login_url} backends={props.globals.backends} key={(p.match.params as any).queue_id} defaultBackend={props.globals.default_backend} />
            }/>
            <Route path='/queue/:queue_id' exact render={p => 
                <QueuePage {...p} user={props.globals.user} loginUrl={props.globals.login_url} backends={props.globals.backends} key={(p.match.params as any).queue_id} defaultBackend={props.globals.default_backend} />
            }/>
            <Route path='/search/:term' exact render={p =>
                <SearchPage {...p} user={props.globals.user} loginUrl={props.globals.login_url} backends={props.globals.backends} defaultBackend={props.globals.default_backend} />
            }/>
            <Route path='/add_queue' exact render={p =>
                <AddQueuePage {...p} user={props.globals.user} loginUrl={props.globals.login_url} backends={props.globals.backends} defaultBackend={props.globals.default_backend} />
            }/>
        </Switch>
    );
}

export const AppRouter = withRouter(App)

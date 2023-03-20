import * as React from "react";
import { Route, withRouter } from 'react-router-dom'
import { RouteComponentProps, Switch } from 'react-router'

import { Globals } from "..";
import { HomePage } from "../components/home";
import { ManagePage } from "../components/manage";
import { QueuePage } from "../components/queue";
import { QueueManagerPage } from "../components/queueManager";
import { SearchPage } from "../components/search";
import { PreferencesPage } from "../components/preferences";
import { AddQueuePage } from "../components/addQueue";
import { ManageQueueSettingsPage } from "../components/queueSettings";
import { useGoogleAnalytics } from "../hooks/useGoogleAnalytics";
import { PageProps } from "../components/page";

interface AppProps extends RouteComponentProps {
    globals: Globals;
}

function App(props: AppProps) {
    useGoogleAnalytics(props.globals.ga_tracking_id, props.globals.debug);

    const commonProps: PageProps = {
        user: props.globals.user,
        loginUrl: props.globals.login_url,
        backends: props.globals.backends,
        defaultBackend: props.globals.default_backend
    };

    return (
        <Switch>
            <Route path='/' exact>
                <HomePage {...commonProps} />
            </Route>
            <Route path='/manage' exact>
                <ManagePage {...commonProps} />
            </Route>
            <Route path='/manage/:queue_id' exact>
                <QueueManagerPage {...commonProps} />
            </Route>
            <Route path='/queue/:queue_id' exact>
                <QueuePage {...commonProps} />
            </Route>
            <Route path='/search/' exact>
                <SearchPage {...commonProps} />
            </Route>
            <Route path='/preferences' exact>
                <PreferencesPage {...commonProps} />
            </Route>
            <Route path='/add_queue' exact>
                <AddQueuePage {...commonProps} />
            </Route>
            <Route path='/manage/:queue_id/settings' exact>
                <ManageQueueSettingsPage {...commonProps} />
            </Route>
        </Switch>
    );
}

export const AppRouter = withRouter(App)

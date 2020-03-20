import * as React from "react";
import { Route, withRouter, useParams } from 'react-router-dom'
import { RouteComponentProps } from 'react-router'
import { Globals } from "..";
import { HomePage } from "../components/home";
import { ManagePage } from "../components/manage";
import { QueuePage } from "../components/queue";

interface AppProps extends RouteComponentProps {
    globals: Globals;
}

function App(props: AppProps) {
    return (
        <>
            <Route path='/' exact render={p => <HomePage {...p} user={props.globals.user} />} />
            <Route path='/manage' exact render={p => <ManagePage {...p} user={props.globals.user} />} />
            <Route path='/queue/:uniqname' exact render={p => <QueuePage {...p} user={props.globals.user} />} />
        </>
    );
}

export const AppRouter = withRouter(App)

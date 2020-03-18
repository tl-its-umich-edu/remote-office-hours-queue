import * as React from "react";
import { Route, withRouter, useParams } from 'react-router-dom'
import { RouteComponentProps } from 'react-router'
import { Globals, User } from "..";
import { Home } from "../components/home";
import { Manage } from "../components/manage";
import { Queue } from "../components/queue";

interface AppProps extends RouteComponentProps {
    globals: Globals;
}

function App(props: AppProps) {
    return (
        <>
            <Route path='/' exact render={p => <Home {...p} user={props.globals.user} />} />
            <Route path='/manage' exact render={p => <Manage {...p} user={props.globals.user} />} />
            <Route path='/queue/:uniqname' exact render={p => <Queue {...p} user={props.globals.user} />} />
        </>
    );
}

export const AppRouter = withRouter(App)

import * as React from "react";
import { Route, withRouter, useParams } from 'react-router-dom'
import { RouteComponentProps } from 'react-router'
import { Globals, User } from "../index";

interface PageProps {
    user?: User;
}

function Index(props: PageProps) {
    const hello = `Hello, ${props.user?.username}!`;
    return <p>{hello}</p>;
}

function Queue(props: PageProps) {
    let { uniqname } = useParams();
    const hello = `Queue for ${uniqname}!`;
    return <p>{hello}</p>;
}

function Manage(props: PageProps) {
    const hello = `Manage, ${props.user?.username}!`;
    return <p>{hello}</p>;
}

interface AppProps extends RouteComponentProps {
    globals: Globals;
}

function App(props: AppProps) {
    return (
        <>
            <Route path='/' exact render={p => <Index {...p} user={props.globals.user} />} />
            <Route path='/manage' exact render={p => <Manage {...p} user={props.globals.user} />} />
            <Route path='/queue/:uniqname' exact render={p => <Queue {...p} user={props.globals.user} />} />
        </>
    );
}

export const AppRouter = withRouter(App)

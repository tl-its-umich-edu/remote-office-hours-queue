import * as React from "react";
import { useState } from "react";
import { MyUser } from "../models";
import { Link } from "react-router-dom";
import { getMyUser as apiGetUser } from "../services/api";
import { ErrorDisplay, FormError, JoinedQueueAlert, Breadcrumbs } from "./common";
import { PageProps } from "./page";
import { useUserWebSocket } from "../hooks/useWebSocket";

function QueueLookup() {
    const [lookup, setLookup] = useState("");
    return (
        <form className="form-inline row" method="get" action={"/search/" + lookup}>
            <div className="input-group col-sm-12 col-md-8 col-lg-6">
                <input type="text"
                    required
                    aria-label="Queue name or host uniqname"
                    className="form-control"
                    placeholder="Queue name or host uniqname..."
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                    />
                <div className="input-group-append">
                    <button type="submit" className="btn btn-primary">Search Queues</button>
                </div>
            </div>
        </form>
    );
}

export function HomePage(props: PageProps) {
    const [user, setUser] = useState(undefined as MyUser | undefined);
    const userWebSocketError = useUserWebSocket(props.user!.id, (u) => setUser(u as MyUser));

    const errorSources = [
        {source: 'Refresh User', error: userWebSocketError}
    ].filter(e => e.error) as FormError[];
    const errorDisplay = <ErrorDisplay formErrors={errorSources}/>
    const queueAlert = user?.my_queue
        && <JoinedQueueAlert joinedQueue={user.my_queue}/>
    const body = props.user
        ? (
            <>
            <p className="lead">
                Enter the name of the queue or the uniqname of the host to get started!
            </p>
            {queueAlert}
            <QueueLookup/>
            <hr/>
            <Link to="/manage">
                Manage Your Own Queues
            </Link>
            </>
        )
        : (
            <>
            <p className="lead">
                Join or host a queue for office hours over BlueJeans!
            </p>
            <a href={props.loginUrl} className="btn btn-primary btn-lg">Login</a>
            </>
        );
    return (
        <div>
            <Breadcrumbs currentPageTitle="Home"/>
            <div>
                {errorDisplay}
                <h1 className="display-4">Remote Office Hours Queue</h1>
                {body}
            </div>
        </div>
    );
}

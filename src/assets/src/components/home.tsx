import * as React from "react";
import { useState, useEffect } from "react";
import { MyUser } from "../models";
import { Link } from "react-router-dom";
import { usePromise } from "../hooks/usePromise";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { getMyUser as apiGetUser } from "../services/api";
import { LoadingDisplay, ErrorDisplay, JoinedQueueAlert, Breadcrumbs } from "./common";
import { PageProps } from "./page";

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
    const getUser = async () => {
        if (!props.user) return;
        return await apiGetUser(props.user.id)
    }
    const [user, setUser] = useState(undefined as MyUser | undefined);
    const [doRefreshUser, refreshUserLoading, refreshUserError] = usePromise(getUser, setUser);
    useEffect(() => {
        doRefreshUser();
    }, []);
    useAutoRefresh(doRefreshUser, 10000);

    const isLoading = refreshUserLoading;
    const error = refreshUserError;
    const loadingDisplay = <LoadingDisplay loading={isLoading}/>
    const errorDisplay = <ErrorDisplay error={error}/>
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
            <p>
            <Link to="/contact">
                View/Update Your Preferences
            </Link>
            </p>
            </>
        )
        : (
            <>
            <p className="lead">
                Join or host a queue for office hours over BlueJeans!
            </p>
            <a href={props.loginUrl} className="btn btn-light btn-lg">Login</a>
            </>
        );
    return (
        <div>
            <Breadcrumbs currentPageTitle="Home"/>
            <div>
                {loadingDisplay}
                {errorDisplay}
                <h1 className="display-4">Remote Office Hours Queue</h1>
                {body}
            </div>
        </div>
    );
}

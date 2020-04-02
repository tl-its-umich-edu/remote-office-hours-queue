import * as React from "react";
import { useState, useEffect } from "react";
import { User, MyUser } from "../models";
import { Link } from "react-router-dom";
import { usePromise } from "../hooks/usePromise";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { getMyUser as apiGetUser } from "../services/api";
import { LoadingDisplay, ErrorDisplay, JoinedQueueAlert } from "./common";

function QueueLookup() {
    const [lookup, setLookup] = useState("");
    return (
        <form className="form-inline" method="get" action={"/queue/" + lookup}>
            <div className="input-group">
                <input type="text" 
                    className="form-control" 
                    name="uniqname" 
                    placeholder="Queue ID..." 
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                    />
                <div className="input-group-append">
                    <button type="submit" className="btn btn-primary">Visit Queue</button>
                </div>
            </div>
        </form>
    );
}

interface HomePageProps {
    user?: User;
}

export function HomePage(props: HomePageProps) {
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
    const queueLink = user?.my_queue
        && (
            <Link to={`/queue/${user.my_queue.id}`}>
                Return to Previous Queue
            </Link>
        );
    const body = props.user
        ? (
            <>
            <p className="lead">
                Enter the ID of the meeting queue you would like to join!
            </p>
            {queueAlert}
            {queueLink}
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
            <a href="/oidc/authenticate" className="btn btn-light btn-lg">Login</a>
            </>
        );
    return (
        <div className="jumbotron">
            {loadingDisplay}
            {errorDisplay}
            <h1 className="display-4">Remote Office Hours Queue</h1>
            {body}
        </div>
    );
}

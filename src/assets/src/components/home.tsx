import * as React from "react";
import { useState } from "react";
import { User } from "../models";
import { Link } from "react-router-dom";

function QueueLookup() {
    const [lookup, setLookup] = useState("");
    return (
        <form className="form-inline" method="get" action={"/queue/" + lookup}>
            <div className="input-group">
                <input type="text" 
                    className="form-control" 
                    name="uniqname" 
                    placeholder="Meeting ID..." 
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
    const body = props.user
        ? (
            <>
            <p className="lead">
                Enter the ID of the meeting queue you would like to join!
            </p>
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
            <h1 className="display-4">Remote Office Hours Queue</h1>
            {body}
        </div>
    );
}

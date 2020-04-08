import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, Link, RouteComponentProps } from "react-router-dom";

import { AttendingQueue, User } from "../models";
import { usePromise } from "../hooks/usePromise";
import { searchQueue as apiSearchQueue } from "../services/api";
import { LoadingDisplay, ErrorDisplay } from "./common";
import { redirectToLogin, redirectToSearch } from "../utils";

interface AttendingQueueListProps {
    queues: AttendingQueue[];
}

function AttendingQueueList(props: AttendingQueueListProps) {
    const queues = props.queues.map(q => 
        <li className="list-group-item" key={q.id}>
            <Link to={`/queue/${q.id}`}>
                {q.name}
            </Link>
        </li>
    );
    return (
        <ul className="list-group">
            {queues}
        </ul>
    );
}

interface SearchPageParams {
    term: string;
}

interface SearchPageProps extends RouteComponentProps<SearchPageParams> {
    user?: User;
}

export function SearchPage(props: SearchPageProps) {
    if (!props.user) {
        redirectToLogin();
    }
    const term = props.match.params.term;
    const [searchResults, setSearchResults] = useState(undefined as AttendingQueue[] | undefined);
    const [doSearch, searchLoading, searchError] = usePromise(
        (term: string) => apiSearchQueue(term),
        setSearchResults
    );
    useEffect(() => {
        if (term) doSearch(term);
    }, []);
    const loadingDisplay = <LoadingDisplay loading={searchLoading}/>
    const errorDisplay = <ErrorDisplay error={searchError}/>
    const resultsDisplay = searchResults === undefined
        ? undefined
        : searchResults.length === 0
            ? (
                <p className="alert alert-danger">
                    No results were found for "{term}".
                </p>
            )
            : <AttendingQueueList queues={searchResults} />
    const redirectAlert = props.location.search.includes("redirected=true")
        && (
            <p className="alert alert-warning">
                We didn't find a queue there! It's ok, we recently made a change that moved some queues around--it's us, not you. To help you find the queue you were looking for, we searched for any queues hosted by {term}.
            </p>
        );
    return (
        <div className="">
            {loadingDisplay}
            {errorDisplay}
            {redirectAlert}
            <h1>Search Results: "{term}"</h1>
            <p className="lead">Select a queue to join.</p>
            {resultsDisplay}
        </div>
    );
}

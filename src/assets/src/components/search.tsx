import * as React from "react";
import { useState, useEffect } from "react";

import { QueueBase } from "../models";
import { usePromise } from "../hooks/usePromise";
import { searchQueue as apiSearchQueue } from "../services/api";
import { LoadingDisplay, ErrorDisplay, FormError, Breadcrumbs, QueueList } from "./common";
import { redirectToLogin } from "../utils";
import { PageProps } from "./page";


interface SearchPageParams {
    term: string;
}

export function SearchPage(props: PageProps<SearchPageParams>) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }
    const term = props.match.params.term;
    const [searchResults, setSearchResults] = useState(undefined as ReadonlyArray<QueueBase> | undefined);
    const [doSearch, searchLoading, searchError] = usePromise(
        (term: string) => apiSearchQueue(term),
        setSearchResults
    );
    useEffect(() => {
        if (term) doSearch(term);
    }, []);
    const loadingDisplay = <LoadingDisplay loading={searchLoading}/>
    const errorSources = [
        {source: 'Search', error: searchError}
    ].filter(e => e.error) as FormError[];
    const errorDisplay = <ErrorDisplay formErrors={errorSources}/>
    const resultsDisplay = searchResults === undefined
        ? undefined
        : searchResults.length === 0
            ? (
                <p className="alert alert-danger">
                    No results were found for "{term}".
                </p>
            )
            : <QueueList queues={searchResults} />
    const redirectAlert = props.location.search.includes("redirected=true") && !/^\d+$/.exec(term)
        && (
            <p className="alert alert-warning">
                We didn't find a queue there! It's ok, we made a change that moved some queues around--it's us, not you. To help you find the queue you were looking for, we searched for any queues hosted by {term}. <a href="https://documentation.its.umich.edu/office-hours-links" target="_blank">Learn more about this search.</a>
            </p>
        );
    return (
        <div>
            <Breadcrumbs currentPageTitle="Search"/>
            {loadingDisplay}
            {errorDisplay}
            {redirectAlert}
            <h1>Search Results: "{term}"</h1>
            <p className="lead">Select a queue to join.</p>
            {resultsDisplay}
        </div>
    );
}

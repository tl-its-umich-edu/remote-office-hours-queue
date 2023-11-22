import * as React from "react";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

import { QueueBase } from "../models";
import { usePromise } from "../hooks/usePromise";
import { searchQueue as apiSearchQueue } from "../services/api";
import { LoadingDisplay, ErrorDisplay, FormError, Breadcrumbs, QueueTable } from "./common";
import { redirectToLogin } from "../utils";
import { PageProps } from "./page";
import { Helmet } from 'react-helmet';
import { getPageTitle } from './titleUtils';


export function SearchPage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }

    const location = useLocation();
    const term = (new URLSearchParams(location.search)).get('term') ?? undefined;

    const [searchResults, setSearchResults] = useState(undefined as ReadonlyArray<QueueBase> | undefined);
    const [doSearch, searchLoading, searchError] = usePromise(
        (term: string) => apiSearchQueue(term),
        setSearchResults
    );
    useEffect(() => {
        if (term !== undefined) {
            doSearch(term);
        } else {
            setSearchResults([]);
        }
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
            : <QueueTable queues={searchResults} />
    return (
        <div>
            <Helmet>
                <title>{getPageTitle('Search')}</title>
            </Helmet>
            <Breadcrumbs currentPageTitle="Search"/>
            {loadingDisplay}
            {errorDisplay}
            <h1>Search Results: "{term}"</h1>
            <p className="lead">Select a queue to join.</p>
            {resultsDisplay}
        </div>
    );
}

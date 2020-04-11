import { useState, useEffect } from 'react'
import GoogleAnalytics from 'react-ga'

export const useGoogleAnalytics = (googleAnalyticsId?: string, debug?: boolean) => {
    const [initialized, setInitialized] = useState(false);
    const [previousPage, setPreviousPage] = useState(null as string | null);

    if (googleAnalyticsId && !initialized) {
        setInitialized(true);
        GoogleAnalytics.initialize(googleAnalyticsId, { debug });
    }

    useEffect(() => {
        const page = window.location.pathname + window.location.search + window.location.hash
        if (googleAnalyticsId && page !== previousPage) {
            setPreviousPage(page);
            GoogleAnalytics.pageview(page);
        }
    });
}

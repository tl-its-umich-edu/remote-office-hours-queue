import { useState, useEffect } from 'react';
import GoogleAnalytics from 'react-ga4';

export const useGoogleAnalytics = (googleAnalyticsId?: string, debug?: boolean) => {
    const [initialized, setInitialized] = useState(false);
    const [previousPage, setPreviousPage] = useState(null as string | null);

    if (googleAnalyticsId && !initialized) {
        setInitialized(true);
        GoogleAnalytics.initialize(googleAnalyticsId, { testMode: debug });
    }

    useEffect(() => {
        const page = window.location.pathname + window.location.search + window.location.hash
        if (googleAnalyticsId && page !== previousPage) {
            setPreviousPage(page);
            GoogleAnalytics.send({ hitType: "pageview", page });
        }
    });
}

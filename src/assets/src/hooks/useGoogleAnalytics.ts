import { useState, useEffect } from 'react';
import GoogleAnalytics from 'react-ga4';
import { useLocation } from 'react-router-dom';

export const useGoogleAnalytics = (googleAnalyticsId?: string, debug?: boolean) => {
    let location = useLocation();
    const [initialized, setInitialized] = useState(false);
    const [previousPage, setPreviousPage] = useState(null as string | null);

    if (googleAnalyticsId && !initialized) {
        setInitialized(true);
        GoogleAnalytics.initialize(googleAnalyticsId, { testMode: debug });
    }

    useEffect(() => {
        const page = location.pathname + location.search + location.hash;
        if (googleAnalyticsId && page !== previousPage) {
            setPreviousPage(page);
            GoogleAnalytics.send({ hitType: "pageview", page });
        }
    }, [location]);
}

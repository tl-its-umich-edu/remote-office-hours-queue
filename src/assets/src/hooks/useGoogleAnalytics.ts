import { useState, useEffect } from 'react';
import GoogleAnalytics from 'react-ga4';
import { useLocation } from 'react-router-dom';
import { useOneTrust } from './useOneTrust';


export const useGoogleAnalytics = (googleAnalyticsId?: string, debug?: boolean) => {
    let location = useLocation();
    const [initializeOneTrust] = useOneTrust();

    const [initialized, setInitialized] = useState(false);
    const [previousPage, setPreviousPage] = useState(null as string | null);
    console.log("useGA rendered, initialized " + (initialized ? "true" : "false"))
    if (googleAnalyticsId && !initialized) {
        console.log("useGA initializing");
        GoogleAnalytics.gtag("consent", "default", {
            ad_storage: "denied",
            analytics_storage: "denied",
            functionality_storage: "denied",
            personalization_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied",
            wait_for_update: 500
        });
        GoogleAnalytics.initialize(googleAnalyticsId, { testMode: debug });
        initializeOneTrust(GoogleAnalytics);
        setInitialized(true);
    }

    useEffect(() => {
        console.log("useGA Effect location" + location.pathname + location.search + location.hash + " previousPage " + previousPage)
        const page = location.pathname + location.search + location.hash;
        if (googleAnalyticsId && page !== previousPage) {
            setPreviousPage(page);
            GoogleAnalytics.send({ hitType: "pageview", page });
        }
    }, [location]);
}

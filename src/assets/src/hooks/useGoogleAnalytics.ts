import { useState, useEffect } from 'react';
import GoogleAnalytics from 'react-ga4';
import { useLocation } from 'react-router-dom';
import { useOneTrust } from './useOneTrust';


export const useGoogleAnalytics = (googleAnalyticsId?: string, debug?: boolean) => {
    let location = useLocation();

    const [initialized, setInitialized] = useState(false);
    const [previousPage, setPreviousPage] = useState(null as string | null);
    console.log("useGA rendered, initialized " + initialized ? "true" : "false")
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
        setInitialized(true);
        GoogleAnalytics.initialize(googleAnalyticsId, { testMode: debug });
    }

    const [loaded, oneTrustActiveGroups, setOptanonWrapper] = useOneTrust();
    if (loaded) {
        console.log("useGA loaded " + oneTrustActiveGroups);
    }
    console.log("useGA oneTrustActiveGroups " + oneTrustActiveGroups);

    useEffect(() => {
        console.log("useGA Effect location" + location.pathname + location.search + location.hash + " previousPage " + previousPage)
        const page = location.pathname + location.search + location.hash;
        if (googleAnalyticsId && page !== previousPage) {
            setPreviousPage(page);
            GoogleAnalytics.send({ hitType: "pageview", page });
        }
    }, [location]);
    
    useEffect(() => {
        console.log("useGA Effect oneTrustActiveGroups" + oneTrustActiveGroups)
        const updateGtagConsent = () => {
          console.log("updateGtagConsent RUN oneTrustActiveGroups " + oneTrustActiveGroups)

            if (oneTrustActiveGroups.includes("C0002")) {
              GoogleAnalytics.gtag("consent", "update", { analytics_storage: "granted" });
            }
            if (oneTrustActiveGroups.includes("C0003")) {
              GoogleAnalytics.gtag("consent", "update", { functional_storage: "granted" });
            }
            if (oneTrustActiveGroups.includes("C0004")) {
              GoogleAnalytics.gtag("consent", "update", {
                ad_storage: "granted",
                ad_user_data: "granted",
                ad_personalization: "granted",
                personalization_storage: "granted"
              });
            } else {
              // Remove Google Analytics cookies if tracking is declined
              document.cookie.split(';').forEach(cookie => {
                const [name] = cookie.split('=');
                if (name.trim().match(/^_ga(_.+)?$/)) {
                  document.cookie = `${name}=;path=/;domain=.${window.location.host.replace(/^(.*\.)?(.+\..+)$/, '$2')};expires=Thu, 01 Jan 1970 00:00:01 GMT`;
                }
              });
            }
            // window.dataLayer.push({ event: 'um_consent_updated' });
            GoogleAnalytics.event({ action: 'um_consent_updated', category: 'consent' });
          };

          setOptanonWrapper(updateGtagConsent)
        }, [oneTrustActiveGroups]);
}

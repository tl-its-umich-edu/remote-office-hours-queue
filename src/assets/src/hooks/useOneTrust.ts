import { GA4 } from 'react-ga4/types/ga4';
import Cookies from "js-cookie";
import { GoogleAnalyticsConsentValue } from './useGoogleAnalytics';

declare global {
    interface Window {
      OnetrustActiveGroups?: string;
      OptanonWrapper?: () => void;
    }
  }

// UofM OneTrust cookie documentation: https://vpcomm.umich.edu/resources/cookie-disclosure/
enum OneTrustCookieCategory {
    StrictlyNecessary = "C0001",
    Performance = "C0002",
    Functionality = "C0003",
    Targeting = "C0004",
    SocialMedia = "C0005",
}

export const useOneTrust = (): [(googleAnalytics:GA4) => void] | [] => 
  {
    // Embeds the script for UofM OneTrust consent banner implementation
    // See instructions at https://vpcomm.umich.edu/resources/cookie-disclosure/#3rd-party-google-analytics
    const initializeOneTrust = (googleAnalytics: GA4) => {
        // Callback is used by OneTrust to update Google Analytics consent tags and remove cookies
        const updateGtagCallback = () => {
          if (!window.OnetrustActiveGroups) {
              return;
          }
          // Update Google Analytics consent based on OneTrust active groups
          // "Strictly Necessary Cookies" are always granted. C0001 (StrictlyNecessary), C0003 (Functionality)
          if (window.OnetrustActiveGroups.includes(OneTrustCookieCategory.Performance)) {
            googleAnalytics.gtag("consent", "update", { analytics_storage: GoogleAnalyticsConsentValue.Granted });
          }
          if (window.OnetrustActiveGroups.includes(OneTrustCookieCategory.Functionality)) {
            googleAnalytics.gtag("consent", "update", { functional_storage: GoogleAnalyticsConsentValue.Granted });
          }

          // "Analytics & Advertising Cookies" are optional for EU users. C0002 (Performance)
          if (window.OnetrustActiveGroups.includes(OneTrustCookieCategory.Targeting)) {
            googleAnalytics.gtag("consent", "update", {
              ad_storage: GoogleAnalyticsConsentValue.Granted,
              ad_user_data: GoogleAnalyticsConsentValue.Granted,
              ad_personalization: GoogleAnalyticsConsentValue.Granted,
              personalization_storage: GoogleAnalyticsConsentValue.Granted
            });
          } else {
            // Remove Google Analytics cookies if tracking is declined by EU users
            // Uses same library as this GA4 implementation: https://dev.to/ramonak/react-enable-google-analytics-after-a-user-grants-consent-5bg3
            Cookies.remove("_ga");
            Cookies.remove("_gat");
            Cookies.remove("_gid");
          }
          googleAnalytics.event({ action: 'um_consent_updated', category: 'consent' });
          }
        window.OptanonWrapper = updateGtagCallback;

        const oneTrustScriptDomain = "03e0096b-3569-4b70-8a31-918e55aa20da"
        const src =`https://cdn.cookielaw.org/consent/${oneTrustScriptDomain}/otSDKStub.js`
        
        const script = document.createElement('script');
        script.src = src;
        script.type = 'text/javascript';
        script.dataset.domainScript = oneTrustScriptDomain;
        document.head.appendChild(script);
    }

    return [ initializeOneTrust ];
};

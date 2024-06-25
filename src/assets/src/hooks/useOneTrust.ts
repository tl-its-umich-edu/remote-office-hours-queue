import { useState, useEffect } from 'react';

declare global {
    interface Window {
      OnetrustActiveGroups?: string;
      OptanonWrapper?: () => void;
    }
  }

export const useOneTrust = (): [boolean, string, (callback: () => void) => void] => {
    const src = 'https://cdn.cookielaw.org/consent/03e0096b-3569-4b70-8a31-918e55aa20da/otSDKStub.js'
    const dataDomainScript ='03e0096b-3569-4b70-8a31-918e55aa20da'
    const [oneTrustActiveGroups, setOneTrustActiveGroups] = useState("");
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        const script = document.createElement('script');
        script.src = src;
        script.type = 'text/javascript';
        if (dataDomainScript) script.dataset.domainScript = dataDomainScript;

        script.onload = () => {
            setLoaded(true);
        }
        script.onerror = () => {
            setLoaded(false);
            console.error(`Failed to load script: ${src}`);
        }

        document.head.appendChild(script);

        return () => {
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
        };
    }, []);

    useEffect(() => {
        if (window.OnetrustActiveGroups) {
            setOneTrustActiveGroups(window.OnetrustActiveGroups);
        }
    }, [window.OnetrustActiveGroups]);

    const setOptanonWrapper = (callback: () => void) => {
        window.OptanonWrapper = callback;
    }

    return [ loaded, oneTrustActiveGroups, setOptanonWrapper ];
};

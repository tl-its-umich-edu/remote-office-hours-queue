import * as React from "react";
import { Route, Routes } from "react-router-dom";

import { Globals } from "..";
import { AddQueuePage } from "../components/addQueue";
import { HomePage } from "../components/home";
import { ManagePage } from "../components/manage";
import { PageProps } from "../components/page";
import { PreferencesPage } from "../components/preferences";
import { QueuePage } from "../components/queue";
import { QueueManagerPage } from "../components/queueManager";
import { ManageQueueSettingsPage } from "../components/queueSettings";
import { SearchPage } from "../components/search";
import { Helmet, HelmetProvider } from "react-helmet-async";


interface AppProps {
    globals: Globals;
}

export function App(props: AppProps) {

    const commonProps: PageProps = {
        user: props.globals.user,
        loginUrl: props.globals.login_url,
        backends: props.globals.backends,
        defaultBackend: props.globals.default_backend,
        otpRequestBuffer: props.globals.otp_request_buffer,
    };

    return (
        <>
            <Routes>
                <Route path="/" element={<HomePage {...commonProps} />} />
                <Route path="/manage" element={<ManagePage {...commonProps} />} />
                <Route path="/manage/:queue_id" element={<QueueManagerPage {...commonProps} />} />
                <Route path="/manage/:queue_id/settings" element={<ManageQueueSettingsPage {...commonProps} />} />
                <Route path="/queue/:queue_id" element={<QueuePage {...commonProps} />} />
                <Route path="/search/" element={<SearchPage {...commonProps} />} />
                <Route path="/preferences" element={<PreferencesPage {...commonProps} />} />
                <Route path="/add_queue" element={<AddQueuePage {...commonProps} />} />
            </Routes>
            <HelmetProvider>
                <Helmet>
                    <script type="text/javascript">
                    {`window.umConsentManager = {
                        googleAnalyticsID: ${props.globals.ga_tracking_id ?`'${props.globals.ga_tracking_id}'`: false},
                        googleAnalyticsCustom: {
                            streamConfig: {
                                cookie_flags: "SameSite=None; Secure"
                            }
                        },
                        externalLinkBlank: true,
                        privacyUrl: false,
                        }
                    `}  
                    </script>
                    <script async src="https://umich.edu/apis/umconsentmanager/consentmanager.js"/>
                </Helmet>
            </HelmetProvider>
        </>
    );
}

import * as React from "react";
import { MeetingBackend, ZoomMetadata } from "../models";


interface OneTouchDialLinkProps {
    phone: string; // "." delimited
    meetingNumber: string;
}

const OneTouchDialLink = (props: OneTouchDialLinkProps) => (
    <a href={`tel:${props.phone.replace(".", "")},,,${props.meetingNumber},%23,%23`}>
        {props.phone}
    </a>
);

interface IntlTelephoneLinkProps {
    intlNumbersURL: string;
}

const IntlTelephoneLink = (props: IntlTelephoneLinkProps) => {
    return (
        <a target="_blank" href={props.intlNumbersURL}>
            find your international number to call in from outside the USA
        </a>
    );
}

interface DialInMessageProps extends OneTouchDialLinkProps, IntlTelephoneLinkProps {
    isHost?: boolean;
    profileURL?: string;
}

const ZoomDialInMessage = (props: DialInMessageProps) => {
    const phoneLinkUsa = <OneTouchDialLink {...props} />;

    const hostMessage = (props.isHost && props.profileURL) && (
        <p>
            When calling in by phone, you will need to enter a host key to start the meeting.
            Find your host key at the bottom of <a href={props.profileURL} target='_blank'>your Zoom profile</a>.
            DO NOT share your host key with anyone!
        </p>
    )

    return (
        <>
        <p>
            Having problems with video? As a back-up, you can call {phoneLinkUsa} from the USA
            (or <IntlTelephoneLink {...props} /> -- click See All Numbers under Toll Call to see all countries)
            from any phone and enter {props.meetingNumber}#. You do not need a participant ID.
        </p>
        {hostMessage}
        </>
    );
}

interface DialInContentProps {
    metadata: ZoomMetadata;
    backend: MeetingBackend;
    isHost?: boolean;
}

export const DialInContent = (props: DialInContentProps) => {
    let dialInMessage;
    if (props.metadata.numeric_meeting_id) {
        const dialInProps = {
            phone: props.backend.telephone_num,
            meetingNumber: props.metadata.numeric_meeting_id,
            intlNumbersURL: props.backend.intl_telephone_url,
            isHost: props.isHost,
            profileURL: props.backend.profile_url
        } as DialInMessageProps;

        dialInMessage = props.backend.name === 'zoom'
            ? <ZoomDialInMessage {...dialInProps} />
            : null;
    } else {
        dialInMessage = <span>Once the meeting is created, instructions for calling in to the meeting on a phone will appear here.</span>;
    }
    return dialInMessage;
}

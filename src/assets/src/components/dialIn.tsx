import * as React from "react";
import { BluejeansMetadata, MeetingBackend, ZoomMetadata } from "../models";


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

type DialInMessageProps = OneTouchDialLinkProps & IntlTelephoneLinkProps;

const BlueJeansDialInMessage = (props: DialInMessageProps) => {
    const phoneLinkUsa = <OneTouchDialLink {...props} />;
    return (
        <span>
            Having problems with video? As a back-up, you can call {phoneLinkUsa} from the USA
            (or <IntlTelephoneLink {...props} />)
            from any phone and enter {props.meetingNumber}#.
            You do not need a passcode to join the meeting.
        </span>
    );
}

const ZoomDialInMessage = (props: DialInMessageProps) => {
    const phoneLinkUsa = <OneTouchDialLink {...props} />;
    return (
        <span>
            Having problems with video? As a back-up, you can call {phoneLinkUsa} from the USA
            (or <IntlTelephoneLink {...props} /> -- click See All Numbers under Toll Call to see all countries)
            from any phone and enter {props.meetingNumber}#.
            You do not need a host key or participant ID.
        </span>
    );
}

interface DialInContentProps {
    metadata: BluejeansMetadata | ZoomMetadata;
    backend: MeetingBackend;
}

export const DialInContent = (props: DialInContentProps) => {
    let dialInMessage;
    if (props.metadata.numeric_meeting_id) {
        const dialInProps = {
            phone: props.backend.telephone_num,
            meetingNumber: props.metadata.numeric_meeting_id,
            intlNumbersURL: props.backend.intl_telephone_url
        } as DialInMessageProps;

        dialInMessage = props.backend.name === 'zoom'
            ? <ZoomDialInMessage {...dialInProps} />
            : props.backend.name === 'bluejeans'
                ? <BlueJeansDialInMessage {...dialInProps} />
                : null;
    } else {
        dialInMessage = <span>Once the meeting is created, instructions for calling in to the meeting on a phone will appear here.</span>;
    }
    return dialInMessage;
}

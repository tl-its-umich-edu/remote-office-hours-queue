import * as React from "react";
import { useEffect } from "react";
import { Alert } from "react-bootstrap";

import { ChangeEvent } from "../changes";


// https://stackoverflow.com/a/56777520

interface TimedChangeAlertProps {
    changeEvent: ChangeEvent,
    deleteChangeEvent: (id: number) => void;
}

function TimedChangeAlert (props: TimedChangeAlertProps) {
    const deleteEvent = () => props.deleteChangeEvent(props.changeEvent.eventID);

    useEffect(() => {
        const timeoutID = setTimeout(deleteEvent, 7000);
        return () => clearTimeout(timeoutID);
    }, []);

    return (
        <Alert variant='info' aria-live='polite' dismissible={true} onClose={deleteEvent}>
            {props.changeEvent.text}
        </Alert>
    );
}

interface ChangeLogProps {
    changeEvents: ChangeEvent[];
    deleteChangeEvent: (id: number) => void;
}

export function ChangeLog (props: ChangeLogProps) {
    const changeAlerts = props.changeEvents.map(
        (e) => <TimedChangeAlert key={e.eventID} changeEvent={e} deleteChangeEvent={props.deleteChangeEvent}/>
    );
    return <div id='change-log'>{changeAlerts}</div>;
}

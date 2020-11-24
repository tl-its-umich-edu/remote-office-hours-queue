import * as React from "react";
import { Alert } from "react-bootstrap";

import { ChangeEvent } from "../changes";


interface ChangeLogProps {
    changeEvents: ChangeEvent[];
    popChangeEvent: (key: number) => void;
}

export function ChangeLog (props: ChangeLogProps) {
    const changeAlerts = props.changeEvents.map(
        (e) => {
            return (
                <Alert
                    variant='info'
                    key={e.eventID}
                    dismissible={true}
                    onClose={() => props.popChangeEvent(e.eventID)}
                >
                    {e.text}
                </Alert>
            )
        }
    )
    return <div id='change-log'>{changeAlerts}</div>;
}

import * as React from "react";
import { Alert } from "react-bootstrap";

import { ChangeEvent, ChangeEventMap } from "../changes";


interface ChangeLogProps {
    changeEventMap: ChangeEventMap;
    popChangeEvent: (key: number) => void;
}

export function ChangeLog (props: ChangeLogProps) {
    const changeAlerts = Object.keys(props.changeEventMap).map(
        (key) => {
            const changeEvent: ChangeEvent = props.changeEventMap[Number(key)];
            return (
                <Alert
                    variant='info'
                    key={key}
                    dismissible={true}
                    onClose={() => props.popChangeEvent(Number(key))}
                >
                    {changeEvent.message}
                </Alert>
            )
        }
    )
    return <div id='change-log'>{changeAlerts}</div>;
}

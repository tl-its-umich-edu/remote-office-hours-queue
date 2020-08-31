import { useState, useEffect } from "react";
import ReconnectingWebSocket from 'reconnecting-websocket';

interface OfficeHoursMessage<T> {
    type: "init"|"update"|"deleted";
    content: T;
}

export const useWebSocket = <T>(url: string, onUpdate: (content: T) => void, onDelete?: (setError: (React.Dispatch<React.SetStateAction<Error | undefined>>)) => void) => {
    const [error, setError] = useState(undefined as Error | undefined);
    useEffect(() => {
        const ws = new ReconnectingWebSocket(
            url,
            undefined,
            {
                maxRetries: 3,
            },
        );
        ws.onmessage = (e: MessageEvent) => {
            const m = JSON.parse(e.data) as OfficeHoursMessage<T>;
            console.log(m);
            switch(m.type) {
                case "init":
                    onUpdate(m.content as T);
                    break;
                case "update":
                    onUpdate(m.content as T);
                    break;
                case "deleted":
                    if (onDelete) {
                        onDelete(setError);
                    } else {
                        throw new Error("Unexpected message type 'deleted': " + e);
                    }
                    break;
            }
        }
        ws.onclose = (e) => {
            if (e.code === 4404) {
                ws.close();
            }
            console.error(e);
            setError(new Error(`The connection unexpectedly closed (${e.code.toString()}). Trying to reconnect...`));
        }
        ws.onopen = (e) => {
            setError(undefined);
        }
        ws.onerror = (e) => {
            console.error("ws.onerror");
            console.error(e);
            setError(new Error(`An unexpected error (${e.error.name}) occured. Trying to reconnect...`));
        }
        return () => {
            ws.close();
        }
    }, []);
    return error;
}

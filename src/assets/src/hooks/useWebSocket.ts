import { useState, useEffect } from "react";

import { QueueHost, QueueAttendee } from "../models";

interface OfficeHoursMessage {
    type: "init"|"update"|"deleted";
    content: QueueHost|QueueAttendee|undefined;
}

export const useQueueWebSocket = (queue_id: number, update: (q: QueueHost | undefined) => void) => {
    const [error, setError] = useState(undefined as Error | undefined);
    useEffect(() => {
        const url = `ws://${location.host}/ws/queue/${queue_id}/`;
        const ws = new WebSocket(url);
        ws.onmessage = (e: MessageEvent) => {
            const m = JSON.parse(e.data) as OfficeHoursMessage;
            console.log(m);
            switch(m.type) {
                case "init":
                    update(m.content as QueueHost);
                    break;
                case "update":
                    update(m.content as QueueHost);
                    break;
                case "deleted":
                    update(undefined);
                    break;
            }
        }
        ws.onerror = (e) => {
            setError(new Error(e.toString()));
        }
        return () => {
            ws.close();
        }
    }, []);
    return error;
}
import { useState, useEffect } from "react";

import { QueueHost } from "../models";

export const useQueueWebSocket = (queue_id: number, update: (q: QueueHost) => void) => {
    const [error, setError] = useState(undefined as Error | undefined);
    useEffect(() => {
        const url = `ws://${location.host}/ws/queue/${queue_id}/`;
        const ws = new WebSocket(url);
        ws.onmessage = (e: MessageEvent) => {
            const q = JSON.parse(e.data);
            console.log(q);
            update(q.content);
        }
        ws.onerror = (e) => {
            setError(new Error(e.toString()));
        }
    }, []);
    return error;
}
import { useState, useEffect } from "react";

import { QueueHost, QueueAttendee, User } from "../models";

interface OfficeHoursMessage<T> {
    type: "init"|"update"|"deleted";
    content: T;
}

type QueueMessage = OfficeHoursMessage<QueueHost|QueueAttendee|undefined>;

export const useQueueWebSocket = (queue_id: number, update: (q: QueueHost | undefined) => void) => {
    const [error, setError] = useState(undefined as Error | undefined);
    useEffect(() => {
        const url = `ws://${location.host}/ws/queue/${queue_id}/`;
        const ws = new WebSocket(url);
        ws.onmessage = (e: MessageEvent) => {
            const m = JSON.parse(e.data) as QueueMessage;
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

type UsersMessage = OfficeHoursMessage<User[]>;

export const useUsersWebSocket = (update: (users: User[]) => void) => {
    const [error, setError] = useState(undefined as Error | undefined);
    useEffect(() => {
        const url = `ws://${location.host}/ws/users/`;
        const ws = new WebSocket(url);
        ws.onmessage = (e: MessageEvent) => {
            console.log(e);
            const m = JSON.parse(e.data) as UsersMessage;
            console.log(m);
            switch(m.type) {
                case "init":
                    update(m.content as User[]);
                    break;
                case "update":
                    update(m.content as User[]);
                    break;
            }
        }
        ws.onerror = (e) => {
            console.error(e);
            setError(new Error(e.toString()));
        }
        return () => {
            ws.close();
        }
    }, []);
    return error;
}

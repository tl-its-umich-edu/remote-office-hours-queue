import { useState, useEffect } from "react";

import { QueueHost, QueueAttendee, User, MyUser } from "../models";

interface OfficeHoursMessage<T> {
    type: "init"|"update"|"deleted";
    content: T;
}

export const useWebSocket = <T>(url: string, update: (content: T) => void, handleDeleted=true) => {
    const [error, setError] = useState(undefined as Error | undefined);
    useEffect(() => {
        const ws = new WebSocket(url);
        ws.onmessage = (e: MessageEvent) => {
            const m = JSON.parse(e.data) as OfficeHoursMessage<T>;
            console.log(m);
            switch(m.type) {
                case "init":
                    update(m.content as T);
                    break;
                case "update":
                    update(m.content as T);
                    break;
                case "deleted":
                    if (handleDeleted) update(undefined!);
                    else throw new Error("Unexpected message type 'deleted': " + e);
                    break;
            }
        }
        ws.onclose = (e: CloseEvent) => {
            console.error(e);
            setError(new Error(e.code.toString()));
        }
        ws.onerror = (e: Event) => {
            console.error(e);
            setError(new Error(e.toString()));
        }
        return () => {
            ws.close();
        }
    }, []);
    return error;
}

export const useQueueWebSocket = (queue_id: number, update: (q: QueueHost | QueueAttendee | undefined) => void) => {
    return useWebSocket(
        `ws://${location.host}/ws/queues/${queue_id}/`,
        update,
    );
}

export const useUsersWebSocket = (update: (users: User[]) => void) => {
    return useWebSocket(
        `ws://${location.host}/ws/users/`,
        update,
        false,
    );
}

export const useUserWebSocket = (user_id: number, update: (user: User|MyUser) => void) => {
    return useWebSocket(
        `ws://${location.host}/ws/users/${user_id}/`,
        update,
    );
}

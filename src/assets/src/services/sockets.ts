import { useWebSocket } from "../hooks/useWebSocket";
import { QueueHost, QueueAttendee, User, MyUser } from "../models";

const getProtocol = () => {
    return location.protocol === "https:" ? "wss:" : "ws:";
}

export const useQueueWebSocket = (queue_id: any, onUpdate: (q: QueueHost | QueueAttendee | undefined) => void) => {
    return useWebSocket(
        `${getProtocol()}//${location.host}/ws/queues/${queue_id}/`,
        onUpdate,
        (setError) => {
            onUpdate(undefined);
            setError(new Error("The queue was deleted."));
        },
    );
}

export const useUserWebSocket = (user_id: number | undefined, onUpdate: (user: User | MyUser) => void) => {
    return typeof user_id === "number"
        ? useWebSocket(
            `${getProtocol()}//${location.host}/ws/users/${user_id}/`,
            onUpdate,
            () => onUpdate(undefined!),
        )
        : undefined;
}

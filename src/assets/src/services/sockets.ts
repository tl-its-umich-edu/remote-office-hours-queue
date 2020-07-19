import { useWebSocket } from "../hooks/useWebSocket";
import { QueueHost, QueueAttendee, User, MyUser } from "../models";

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

export const useUserWebSocket = (user_id: number | undefined, update: (user: User | MyUser) => void) => {
    return typeof user_id === "number"
        ? useWebSocket(
            `ws://${location.host}/ws/users/${user_id}/`,
            update,
        )
        : undefined;
}

import { ManageQueue, AttendingQueue, User } from "../models";

const getCsrfToken = () => {
    return (document.querySelector("[name='csrfmiddlewaretoken']") as HTMLInputElement).value;
}

export const getUsers = async () => {
    const resp = await fetch("/api/users/", { method: "GET" });
    if (!resp.ok) {
        throw new Error(resp.statusText);
    }
    return await resp.json() as User[];
}

export const getQueues = async () => {
    const resp = await fetch("/api/queues/", { method: "GET" });
    if (!resp.ok) {
        throw new Error(resp.statusText);
    }
    return await resp.json() as ManageQueue[];
}

export const getQueue = async (id: number) => {
    const resp = await fetch("/api/queues/" + id, { method: "GET" });
    if (!resp.ok) {
        throw new Error(resp.statusText);
    }
    return await resp.json() as ManageQueue | AttendingQueue;
}

export const createQueue = async (name: string) => {
    const resp = await fetch("/api/queues/", { 
        method: "POST",
        body: JSON.stringify({
            name: name,
            host_ids: [],  //Ideally, this wouldn't be required
        }),
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
        },
    });
    if (!resp.ok) {
        throw new Error(resp.statusText);
    }
    return await resp.json() as ManageQueue;
}

export const deleteQueue = async (id: number) => {
    const resp = await fetch("/api/queues/" + id, { 
        method: "DELETE",
        headers: {
            'X-CSRFToken': getCsrfToken(),
        }
    });
    if (!resp.ok) {
        throw new Error(resp.statusText);
    }
    return resp;
}

export const addMeeting = async (queue_id: number, user_id: number) => {
    const resp = await fetch("/api/meetings/", {
        method: "POST",
        body: JSON.stringify({
            queue: queue_id,
            attendee_ids: [user_id],
        }),
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
        },
    });
    if (!resp.ok) {
        throw new Error(resp.statusText);
    }
    return resp;
}

export const removeMeeting = async (meeting_id: number) => {
    const resp = await fetch("/api/meetings/" + meeting_id, {
        method: "DELETE",
        headers: {
            'X-CSRFToken': getCsrfToken(),
        }
    });
    if (!resp.ok) {
        throw new Error(resp.statusText);
    }
    return resp;
}

export const addHost = async (queue_id: number, user_id: number) => {
    const resp = await fetch(`/api/queues/${queue_id}/hosts/${user_id}/`, { method: "POST" });
    if (!resp.ok) {
        throw new Error(resp.statusText);
    }
    return resp;
}

export const removeHost = async (queue_id: number, user_id: number) => {
    const resp = await fetch(`/api/queues/${queue_id}/hosts/${user_id}/`, { method: "DELETE" });
    if (!resp.ok) {
        throw new Error(resp.statusText);
    }
    return resp;
}

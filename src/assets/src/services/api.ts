import { QueueBase, QueueHost, QueueAttendee, User, MyUser, Meeting } from "../models";

const getCsrfToken = () => {
    return (document.querySelector("[name='csrfmiddlewaretoken']") as HTMLInputElement).value;
}

const getPostHeaders = () => {
    return {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
    };
}

const getPatchHeaders = getPostHeaders;

const getDeleteHeaders = () => {
    return {
        'X-CSRFToken': getCsrfToken(),
    };
}

class ForbiddenError extends Error {
    public name = "ForbiddenError";
    constructor() {
        super("You aren't authorized to perform that action. Your session may have expired.");
    }
}

class NotFoundError extends Error {
    public name = "NotFoundError";
    constructor() {
        super("The resource you're looking for was not found. Maybe it was deleted.");
    }
}

const handleErrors = async (resp: Response) => {
    if (resp.ok) return;
    let text: string;
    let json: any;
    switch (resp.status) {
        case 400:
            json = await resp.json();
            const messages = ([] as string[][]).concat(...Object.values<string[]>(json));
            const formatted = messages.join("\n");
            throw new Error(formatted);
        case 403:
            text = await resp.text();
            console.error(text);
            throw new ForbiddenError();
        case 404:
            text = await resp.text();
            console.error(text);
            throw new NotFoundError();
        case 502:
            json = await resp.json();
            console.error(json);
            throw new Error(json.detail);
        default:
            console.error(await resp.text());
            throw new Error(resp.statusText);
    }
}

export const getUsers = async () => {
    const resp = await fetch("/api/users/", { method: "GET" });
    await handleErrors(resp);
    return await resp.json() as User[];
}

export const getQueues = async () => {
    const resp = await fetch("/api/queues/", { method: "GET" });
    await handleErrors(resp);
    return await resp.json() as QueueHost[];
}

export const getQueue = async (id: number) => {
    const resp = await fetch(`/api/queues/${id}/`, { method: "GET" });
    await handleErrors(resp);
    return await resp.json() as QueueHost | QueueAttendee;
}

export const createQueue = async (
    name: string, allowed_backends: Set<string>, description?: string, hosts?: User[]
) => {
    const resp = await fetch("/api/queues/", { 
        method: "POST",
        body: JSON.stringify({
            name: name,
            allowed_backends: Array.from(allowed_backends),
            description: description,
            host_ids: hosts ? hosts.map(h => h.id) : []
        }),
        headers: getPostHeaders(),
    });
    await handleErrors(resp);
    return await resp.json() as QueueHost;
}

export const deleteQueue = async (id: number) => {
    const resp = await fetch(`/api/queues/${id}/`, { 
        method: "DELETE",
        headers: getDeleteHeaders(),
    });
    await handleErrors(resp);
    return resp;
}

export const addMeeting = async (queue_id: number, user_id: number, backend_type: string) => {
    const resp = await fetch("/api/meetings/", {
        method: "POST",
        body: JSON.stringify({
            queue: queue_id,
            attendee_ids: [user_id],
            assignee_id: null,
            backend_type: backend_type,
        }),
        headers: getPostHeaders(),
    });
    await handleErrors(resp);
    return resp;
}

export const removeMeeting = async (meeting_id: number) => {
    const resp = await fetch(`/api/meetings/${meeting_id}`, {
        method: "DELETE",
        headers: getDeleteHeaders(),
    });
    await handleErrors(resp);
    return resp;
}

export const addHost = async (queue_id: number, user_id: number) => {
    const resp = await fetch(`/api/queues/${queue_id}/hosts/${user_id}/`, {
        method: "POST",
        headers: getPostHeaders(),
    });
    await handleErrors(resp);
    return resp;
}

export const removeHost = async (queue_id: number, user_id: number) => {
    const resp = await fetch(`/api/queues/${queue_id}/hosts/${user_id}/`, {
        method: "DELETE",
        headers: getDeleteHeaders(),
    });
    await handleErrors(resp);
    return resp;
}

export const changeQueueName = async (queue_id: number, name: string) => {
    const resp = await fetch(`/api/queues/${queue_id}/`, {
        method: "PATCH",
        headers: getPatchHeaders(),
        body: JSON.stringify({
            name: name,
        }),
    });
    await handleErrors(resp);
    return await resp.json();
}

export const changeQueueDescription = async (queue_id: number, description: string) => {
    const resp = await fetch(`/api/queues/${queue_id}/`, {
        method: "PATCH",
        headers: getPatchHeaders(),
        body: JSON.stringify({
            description: description,
        }),
    });
    await handleErrors(resp);
    return await resp.json();
}

export const setStatus = async (queue_id: number, open: boolean) => {
    const resp = await fetch(`/api/queues/${queue_id}/`, {
        method: "PATCH",
        headers: getPatchHeaders(),
        body: JSON.stringify({
            status: open ? "open" : "closed",
        }),
    });
    await handleErrors(resp);
    return await resp.json();
}

export const getUser = async (id_or_username: number | string) => {
    const resp = await fetch(`/api/users/${id_or_username}/`, { method: "GET" });
    await handleErrors(resp);
    return await resp.json() as User | MyUser;
}

export const updateUser = async (user_id: number, phone_number: string) => {
    const resp = await fetch(`/api/profiles/${user_id}/`, {
        method: "PATCH",
        headers: getPatchHeaders(),
        body: JSON.stringify({
            phone_number: phone_number,
        }),
    });
    await handleErrors(resp);
    return await resp.json() as User | MyUser;
}

export const searchQueue = async (term: string) => {
    const resp = await fetch(`/api/queues_search/?search=${term}`, { method: "GET" });
    await handleErrors(resp);
    return await resp.json() as ReadonlyArray<QueueBase>;
}

export const changeAgenda = async (meeting_id: number, agenda: string) => {
    const resp = await fetch(`/api/meetings/${meeting_id}/`, {
        method: "PATCH",
        headers: getPatchHeaders(),
        body: JSON.stringify({
            agenda: agenda,
        }),
    });
    await handleErrors(resp);
    return await resp.json() as Meeting;
}

export const changeMeetingAssignee = async (meeting_id: number, user_id: number | undefined) => {
    const resp = await fetch(`/api/meetings/${meeting_id}/`, {
        method: "PATCH",
        headers: getPatchHeaders(),
        body: JSON.stringify({
            assignee_id: user_id === undefined ? null : user_id,
        }),
    });
    await handleErrors(resp);
    return await resp.json() as Meeting;
}

export const changeMeetingType = async (meeting_id: number, backend_type: string) => {
    const resp = await fetch(`/api/meetings/${meeting_id}/`, {
        method: "PATCH",
        headers: getPatchHeaders(),
        body: JSON.stringify({
            backend_type: backend_type,
        }),
    });
    await handleErrors(resp);
    return await resp.json() as Meeting;
}

export const updateAllowedMeetingTypes = async (queue_id: number, allowed_backends: Set<string>) => {
    const resp = await fetch(`/api/queues/${queue_id}/`, {
        method: "PATCH",
        headers: getPatchHeaders(),
        body: JSON.stringify({
            allowed_backends: Array.from(allowed_backends),
        }),
    });
    await handleErrors(resp);
    return await resp.json() as QueueHost | QueueAttendee;
}

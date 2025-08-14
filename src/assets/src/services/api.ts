import {
  QueueBase,
  QueueHost,
  QueueAttendee,
  User,
  MyUser,
  Meeting,
  QueueAnnouncement,
} from "../models";

const getCsrfToken = () => {
  return (
    document.querySelector("[name='csrfmiddlewaretoken']") as HTMLInputElement
  ).value;
};

const getPostHeaders = () => {
  return {
    "Content-Type": "application/json",
    "X-CSRFToken": getCsrfToken(),
  };
};

const getPatchHeaders = getPostHeaders;

const getDeleteHeaders = () => {
  return {
    "X-CSRFToken": getCsrfToken(),
  };
};

class ForbiddenError extends Error {
  public name = "ForbiddenError";
  constructor() {
    super(
      "You aren't authorized to perform that action. Your session may have expired."
    );
  }
}

class NotFoundError extends Error {
  public name = "NotFoundError";
  constructor() {
    super(
      "The resource you're looking for was not found. Maybe it was deleted."
    );
  }
}

const handleErrors = async (resp: Response) => {
  if (resp.ok) return;
  let text: string;
  let json: any;
  switch (resp.status) {
    case 400:
      json = await resp.json();
      const messages = ([] as string[][]).concat(
        ...Object.values<string[]>(json)
      );
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
};

const downloadCsv = async (resp: Response) => {
  const data = await resp.blob();
  const url = window.URL.createObjectURL(data);
  const contentDisposition = resp.headers.get("Content-Disposition");
  let filename = "download.csv"; // Default filename
  if (contentDisposition) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    let matches = filenameRegex.exec(contentDisposition);
    if (matches && matches[1]) {
      filename = matches[1].replace(/['"]/g, "");
    }
  }
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const getUsers = async () => {
  const resp = await fetch("/api/users/", { method: "GET" });
  await handleErrors(resp);
  return (await resp.json()) as User[];
};

export const getQueues = async () => {
  const resp = await fetch("/api/queues/", { method: "GET" });
  await handleErrors(resp);
  return (await resp.json()) as QueueHost[];
};

export const getQueue = async (id: number) => {
  const resp = await fetch(`/api/queues/${id}/`, { method: "GET" });
  await handleErrors(resp);
  return (await resp.json()) as QueueHost | QueueAttendee;
};

export const createQueue = async (
  name: string,
  allowed_backends: Set<string>,
  description?: string,
  inperson_location?: string,
  hosts?: User[]
) => {
  const resp = await fetch("/api/queues/", {
    method: "POST",
    body: JSON.stringify({
      name: name,
      allowed_backends: Array.from(allowed_backends),
      description: description,
      inperson_location: inperson_location,
      host_ids: hosts ? hosts.map((h) => h.id) : [],
    }),
    headers: getPostHeaders(),
  });
  await handleErrors(resp);
  return (await resp.json()) as QueueHost;
};

export const updateQueue = async (
  queue_id: number,
  name?: string,
  description?: string,
  inperson_location?: string,
  allowed_backends?: Set<string>
) => {
  const queuePatched = Object();
  if (name !== undefined) queuePatched["name"] = name;
  if (description !== undefined) queuePatched["description"] = description;
  if (inperson_location !== undefined)
    queuePatched["inperson_location"] = inperson_location;
  if (allowed_backends)
    queuePatched["allowed_backends"] = Array.from(allowed_backends);

  const resp = await fetch(`/api/queues/${queue_id}/`, {
    method: "PATCH",
    headers: getPatchHeaders(),
    body: JSON.stringify(queuePatched),
  });
  await handleErrors(resp);
  return (await resp.json()) as QueueHost | QueueAttendee;
};

export const deleteQueue = async (id: number) => {
  const resp = await fetch(`/api/queues/${id}/`, {
    method: "DELETE",
    headers: getDeleteHeaders(),
  });
  await handleErrors(resp);
  return resp;
};

export const addMeeting = async (
  queue_id: number,
  user_id: number,
  backend_type: string,
  assignee_id?: number
) => {
  const resp = await fetch("/api/meetings/", {
    method: "POST",
    body: JSON.stringify({
      queue: queue_id,
      attendee_ids: [user_id],
      assignee_id: assignee_id ?? null,
      backend_type: backend_type,
    }),
    headers: getPostHeaders(),
  });
  await handleErrors(resp);
  return resp;
};

export const removeMeeting = async (meeting_id: number) => {
  const resp = await fetch(`/api/meetings/${meeting_id}/`, {
    method: "DELETE",
    headers: getDeleteHeaders(),
  });
  await handleErrors(resp);
  return resp;
};

export const addHost = async (queue_id: number, user_id: number) => {
  const resp = await fetch(`/api/queues/${queue_id}/hosts/${user_id}/`, {
    method: "POST",
    headers: getPostHeaders(),
  });
  await handleErrors(resp);
  return resp;
};

export const removeHost = async (queue_id: number, user_id: number) => {
  const resp = await fetch(`/api/queues/${queue_id}/hosts/${user_id}/`, {
    method: "DELETE",
    headers: getDeleteHeaders(),
  });
  await handleErrors(resp);
  return resp;
};

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
};

export const getUser = async (id_or_username: number | string) => {
  const resp = await fetch(`/api/users/${id_or_username}/`, { method: "GET" });
  await handleErrors(resp);
  return (await resp.json()) as User | MyUser;
};

export const updateUser = async (
  user_id: number,
  phone_number: string,
  notify_me_attendee: boolean,
  notify_me_host: boolean,
  notify_me_announcement: boolean
) => {
  const resp = await fetch(`/api/users/${user_id}/`, {
    method: "PATCH",
    headers: getPatchHeaders(),
    body: JSON.stringify({
      phone_number,
      notify_me_attendee,
      notify_me_host,
      notify_me_announcement,
    }),
  });
  await handleErrors(resp);
  return (await resp.json()) as User | MyUser;
};

export const getOneTimePassword = async (
  user_id: number,
  phone_number: string
) => {
  const resp = await fetch(`/api/users/${user_id}/otp/`, {
    method: "PATCH",
    headers: getPostHeaders(),
    body: JSON.stringify({
      action: "send",
      otp_phone_number: phone_number,
    }),
  });
  await handleErrors(resp);
  return await resp.json();
};

export const verifyOneTimePassword = async (user_id: number, otp: string) => {
  const resp = await fetch(`/api/users/${user_id}/otp/`, {
    method: "PATCH",
    headers: getPostHeaders(),
    body: JSON.stringify({
      action: "verify",
      otp_token: otp,
    }),
  });
  await handleErrors(resp);
  return await resp.json();
};

export const searchQueue = async (term: string) => {
  const resp = await fetch(
    `/api/queues_search/?search=${encodeURIComponent(term)}`,
    { method: "GET" }
  );
  await handleErrors(resp);
  return (await resp.json()) as ReadonlyArray<QueueBase>;
};

export const changeAgenda = async (meeting_id: number, agenda: string) => {
  const resp = await fetch(`/api/meetings/${meeting_id}/`, {
    method: "PATCH",
    headers: getPatchHeaders(),
    body: JSON.stringify({
      agenda: agenda,
    }),
  });
  await handleErrors(resp);
  return (await resp.json()) as Meeting;
};

export const changeMeetingAssignee = async (
  meeting_id: number,
  user_id: number | undefined
) => {
  const resp = await fetch(`/api/meetings/${meeting_id}/`, {
    method: "PATCH",
    headers: getPatchHeaders(),
    body: JSON.stringify({
      assignee_id: user_id === undefined ? null : user_id,
    }),
  });
  await handleErrors(resp);
  return (await resp.json()) as Meeting;
};

export const changeMeetingType = async (
  meeting_id: number,
  backend_type: string
) => {
  const resp = await fetch(`/api/meetings/${meeting_id}/`, {
    method: "PATCH",
    headers: getPatchHeaders(),
    body: JSON.stringify({
      backend_type: backend_type,
    }),
  });
  await handleErrors(resp);
  return (await resp.json()) as Meeting;
};

export const startMeeting = async (meeting_id: number) => {
  const resp = await fetch(`/api/meetings/${meeting_id}/start/`, {
    method: "POST",
    headers: getPostHeaders(),
  });
  await handleErrors(resp);
  return (await resp.json()) as Meeting;
};

export const exportQueueHistoryLogs = async (queue_id: number) => {
  const resp = await fetch(`/api/export_meeting_start_logs/${queue_id}/`, {
    method: "GET",
  });
  await handleErrors(resp);
  if (resp.status == 204) {
    // No content in CSV
    throw new Error("This queue has no meeting history.");
  }
  await downloadCsv(resp);
};

export const exportAllQueueHistoryLogs = async () => {
  const resp = await fetch(`/api/export_meeting_start_logs/`, {
    method: "GET",
  });
  await handleErrors(resp);
  if (resp.status == 204) {
    // No content in CSV
    throw new Error("You have no queues with meeting history.");
  }
  await downloadCsv(resp);
};

// Queue Announcement API functions

export const createAnnouncement = async (queue_id: number, text: string) => {
  const resp = await fetch(`/api/queues/${queue_id}/announcements/`, {
    method: "POST",
    body: JSON.stringify({
      text: text,
    }),
    headers: getPostHeaders(),
  });
  await handleErrors(resp);
  return (await resp.json()) as QueueAnnouncement;
};

export const updateAnnouncement = async (
  queue_id: number,
  announcement_id: number,
  text: string,
  active?: boolean
) => {
  const announcementPatched: any = { text };
  if (active !== undefined) {
    announcementPatched.active = active;
  }

  const resp = await fetch(
    `/api/queues/${queue_id}/announcements/${announcement_id}/`,
    {
      method: "PATCH",
      headers: getPatchHeaders(),
      body: JSON.stringify(announcementPatched),
    }
  );
  await handleErrors(resp);
  return (await resp.json()) as QueueAnnouncement;
};

export const deleteAnnouncement = async (
  queue_id: number,
  announcement_id: number
) => {
  const resp = await fetch(
    `/api/queues/${queue_id}/announcements/${announcement_id}/`,
    {
      method: "DELETE",
      headers: getDeleteHeaders(),
    }
  );
  await handleErrors(resp);
  return resp;
};

export const deactivateCurrentAnnouncement = async (
  queue_id: number,
  announcement_id: number
) => {
  return updateAnnouncement(queue_id, announcement_id, "", false);
};

export const getAllActiveAnnouncements = async (queue_id: number) => {
  const resp = await fetch(`/api/queues/${queue_id}/announcements/`, {
    method: "GET",
  });
  await handleErrors(resp);
  return (await resp.json()) as QueueAnnouncement[];
};

export const getMyActiveAnnouncement = async (queue_id: number) => {
  const resp = await fetch(
    `/api/queues/${queue_id}/announcements/?created_by=me`,
    {
      method: "GET",
    }
  );
  await handleErrors(resp);
  const announcements = (await resp.json()) as QueueAnnouncement[];
  return announcements.length > 0 ? announcements[0] : null;
};

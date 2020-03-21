import { ManageQueue, AttendingQueue } from "../models";

export const getQueues = () =>
    fetch("/api/queue", { method: "GET" })
        .then((res) => res.json() as Promise<ManageQueue[]>);

const sleep = async (ms: number): Promise<void> =>
    new Promise(resolve => {
      setTimeout(resolve, ms);
    });

const fakeQueues: ManageQueue[] = [
    {
        id: 0,
        name: 'first queue',
        hosts: [
            {
                username: 'jlost',
                first_name: 'James',
                last_name: 'Ostrander',
            }
        ],
        created_at: 'Todayish',
        meetings: [
            {
                id: 1,
                attendees: [
                    {
                        id: 0,
                        user: {
                            username: 'steinhof',
                            first_name: 'Kris',
                            last_name: 'Steinhoff',
                        }
                    }
                ]
            },
            {
                id: 2,
                attendees: [
                    {
                        id: 1,
                        user: {
                            username: 'ericboyd',
                            first_name: 'Eric',
                            last_name: 'Boyd',
                        }
                    }
                ]
            },
        ]
    },
    {
        id: 1,
        name: 'second queue',
        hosts: [
            {
                username: 'jlost',
                first_name: 'James',
                last_name: 'Ostrander',
            }
        ],
        created_at: 'Yesterdayish',
        meetings: [
            {
                id: 3,
                attendees: [
                    {
                        id: 2,
                        user: {
                            username: 'steinhof',
                            first_name: 'Kris',
                            last_name: 'Steinhoff',
                        }
                    }
                ]
            },
            {
                id: 4,
                attendees: [
                    {
                        id: 3,
                        user: {
                            username: 'ericboyd',
                            first_name: 'Eric',
                            last_name: 'Boyd',
                        }
                    }
                ]
            },
        ]
    },
]

export const getQueuesFake = async (): Promise<ManageQueue[]> => {
    await sleep(1000);
    return fakeQueues;
}

export const removeMeetingFake = async (queue_id: number, meeting_id: number): Promise<ManageQueue> => {
    await sleep(1000);
    const queue = fakeQueues.find(q => q.id === queue_id);
    if (!queue) throw new Error("Queue not found");
    const attendeeAt = queue.meetings.findIndex(m => m.id === meeting_id);
    queue.meetings.splice(attendeeAt, 1);
    return JSON.parse(JSON.stringify(queue));
}

export const addMeetingFake = async (queue_id: number, username: string): Promise<ManageQueue> => {
    await sleep(1000);
    const queue = fakeQueues.find(q => q.id === queue_id);
    if (!queue) throw new Error("Queue not found");
    queue.meetings.push({
        id: 999,
        attendees: [
            {
                id: 999,
                user: {
                    username: username,
                    first_name: 'Julius',
                    last_name: 'Mimblewarm',
                }
            }
        ]
    });
    return JSON.parse(JSON.stringify(queue));
}

export const removeHostFake = async (queue_id: number, username: string): Promise<ManageQueue> => {
    await sleep(1000);
    const queue = fakeQueues.find(q => q.id === queue_id);
    if (!queue) throw new Error("Queue not found");
    const hostAt = queue.hosts.findIndex(h => h.username === username);
    queue.hosts.splice(hostAt, 1);
    return JSON.parse(JSON.stringify(queue));
}

export const addHostFake = async (queue_id: number, username: string): Promise<ManageQueue> => {
    await sleep(1000);
    const queue = fakeQueues.find(q => q.id === queue_id);
    if (!queue) throw new Error("Queue not found");
    queue.hosts.push({
        username,
        first_name: "Joseph",
        last_name: "Joestar",
    });
    return JSON.parse(JSON.stringify(queue));
}

export const removeQueueFake = async (queue_id: number): Promise<void> => {
    await sleep(1000);
    const queueAt = fakeQueues.findIndex(q => q.id === queue_id);
    if (!queueAt) throw new Error("Queue not found");
    fakeQueues.splice(queueAt, 1);
}

export const addQueueFake = async (name: string): Promise<ManageQueue> => {
    await sleep(1000);
    const queue = {
        id: 777,
        name,
        hosts: [
            {
                username: 'yourself',
                first_name: 'Michael',
                last_name: 'Jackson',
            }
        ],
        created_at: 'Just now',
        meetings: [],
    };
    fakeQueues.push(queue);
    return JSON.parse(JSON.stringify(queue));
}

const getQueueAttendingFakeSync = (queue_id: number, uniqname: string): AttendingQueue => {
    const queue = fakeQueues.find(q => q.id === queue_id);
    if (!queue) throw new Error("Queue not found!");
    const queuedAt = queue.meetings.findIndex(m => 
        m.attendees.find(a => a.user.username === uniqname)
    );
    return {
        id: queue.id,
        name: queue.name,
        hosts: queue.hosts,
        created_at: queue.created_at,
        queue_length: queue.meetings.length,
        queued_ahead: queuedAt === -1 ? undefined : queuedAt,
    };
}

export const getQueueAttendingFake = async (queue_id: number, uniqname: string): Promise<AttendingQueue> => {
    await sleep(1000);
    return getQueueAttendingFakeSync(queue_id, uniqname);
}

export const joinQueueFake = async (queue_id: number, uniqname: string): Promise<AttendingQueue> => {
    await sleep(1000);
    const queue = fakeQueues.find(q => q.id === queue_id);
    if (!queue) throw new Error("Queue not found!");
    queue.meetings.push({
        id: 555,
        attendees: [
            {
                id: 400,
                user: {
                    username: uniqname,
                    first_name: "Tibald",
                    last_name: "Tremulous",
                }
            }
        ]
    });
    return getQueueAttendingFakeSync(queue_id, uniqname);
}

export const leaveQueueFake = async (queue_id: number, uniqname: string): Promise<AttendingQueue> => {
    await sleep(1000);
    const queue = fakeQueues.find(q => q.id === queue_id);
    if (!queue) throw new Error("Queue not found!");
    const meetingAt = queue.meetings.findIndex(m => 
        m.attendees.find(a => a.user.username === uniqname)
    );
    queue.meetings.splice(meetingAt, 1);
    return getQueueAttendingFakeSync(queue_id, uniqname);
}

export const getQueueFake = async (queue_id: number): Promise<ManageQueue> => {
    await sleep(1000);
    const queue = fakeQueues.find(q => q.id === queue_id);
    if (!queue) throw new Error("Queue not found!");
    return queue;
}

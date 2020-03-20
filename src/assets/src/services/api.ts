import { Queue } from "../models";

const sleep = async (ms: number): Promise<void> =>
    new Promise(resolve => {
      setTimeout(resolve, ms);
    });

export const getQueues = () =>
    fetch("/api/queue", { method: "GET" })
        .then((res) => res.json() as Promise<Queue[]>);

const fakeQueues: Queue[] = [
    {
        id: 0,
        name: 'first queue',
        hosts: [
            {
                id: 0,
                user: {
                    username: 'jlost',
                    first_name: 'James',
                    last_name: 'Ostrander',
                }
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
                id: 0,
                user: {
                    username: 'jlost',
                    first_name: 'James',
                    last_name: 'Ostrander',
                }
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

export const getQueuesFake = async (): Promise<Queue[]> => {
    await sleep(1000);
    return fakeQueues;
}

export const removeMeetingFake = async (queue_id: number, meeting_id: number): Promise<Queue> => {
    await sleep(1000);
    const queue = fakeQueues.find(q => q.id === queue_id);
    if (!queue) throw new Error("Queue not found");
    const attendeeAt = queue.meetings.findIndex(m => m.id === meeting_id);
    queue.meetings.splice(attendeeAt, 1);
    return queue;
}

export const addMeetingFake = async (queue_id: number, username: string): Promise<Queue> => {
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
    return queue;
}

export const removeHostFake = async (queue_id: number, host_id: number): Promise<Queue> => {
    await sleep(1000);
    const queue = fakeQueues.find(q => q.id === queue_id);
    if (!queue) throw new Error("Queue not found");
    const hostAt = queue.hosts.findIndex(h => h.id === host_id);
    queue.hosts.splice(hostAt, 1);
    return queue;
}

export const addHostFake = async (queue_id: number, username: string): Promise<Queue> => {
    await sleep(1000);
    const queue = fakeQueues.find(q => q.id === queue_id);
    if (!queue) throw new Error("Queue not found");
    queue.hosts.push({
        id: 888,
        user: {
            username,
            first_name: "Joseph",
            last_name: "Joestar",
        }
    });
    return queue;
}

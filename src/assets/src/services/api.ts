import { Queue } from "../models";

const sleep = async (ms: number): Promise<void> =>
    new Promise(resolve => {
      setTimeout(resolve, ms);
    });

export const getQueues = () =>
    fetch("/api/queue", { method: "GET" })
        .then((res) => res.json() as Promise<Queue[]>);

export const getQueuesFake = async (): Promise<Queue[]> => {
    await sleep(1000);
    return [
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
                            user: {
                                username: 'steinhof',
                                first_name: 'Kris',
                                last_name: 'Steinhoff',
                            }
                        }
                    ]
                },
                {
                    attendees: [
                        {
                            id: 2,
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
                    attendees: [
                        {
                            id: 4,
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
    ] as Queue[];
}

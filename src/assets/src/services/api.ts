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
            name: 'first queue',
            hosts: [
                {
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
            name: 'second queue',
            hosts: [
                {
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

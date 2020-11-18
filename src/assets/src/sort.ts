import { QueueBase } from "./models";


type CompareQueueFunc = (a: QueueBase, b: QueueBase) => number;

const compareQueueStatus: CompareQueueFunc = (a, b) => {
    if (a.status === 'open' && b.status === 'closed') {
        return -1;
    } else if (a.status === 'closed' && b.status === 'open') {
        return 1;
    }
    return 0;
}

const compareQueueIDDesc: CompareQueueFunc = (a, b) => {
    if (a.id > b.id) {
        return -1;
    } else {
        return 1;
    }
}

export const sortQueues = (queues: QueueBase[]): QueueBase[] => {
    return queues.sort(compareQueueIDDesc).sort(compareQueueStatus);
}

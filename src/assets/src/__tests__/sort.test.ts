import { sortQueues } from "../sort";
import { QueueBase } from "../models";

describe("sortQueues", () => {
  it("should sort queues by status (open first) then by ID descending", () => {
    const queues: QueueBase[] = [
      { id: 1, name: "Queue 1", status: "closed" },
      { id: 3, name: "Queue 3", status: "open" },
      { id: 2, name: "Queue 2", status: "open" },
    ];

    const result = sortQueues(queues);

    expect(result[0]).toEqual({ id: 3, name: "Queue 3", status: "open" });
    expect(result[1]).toEqual({ id: 2, name: "Queue 2", status: "open" });
    expect(result[2]).toEqual({ id: 1, name: "Queue 1", status: "closed" });
  });
});

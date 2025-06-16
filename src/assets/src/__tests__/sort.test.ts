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

  it("should handle all open queues sorted by ID descending", () => {
    const queues: QueueBase[] = [
      { id: 1, name: "Queue 1", status: "open" },
      { id: 5, name: "Queue 5", status: "open" },
      { id: 3, name: "Queue 3", status: "open" },
    ];

    const result = sortQueues(queues);

    expect(result[0]).toEqual({ id: 5, name: "Queue 5", status: "open" });
    expect(result[1]).toEqual({ id: 3, name: "Queue 3", status: "open" });
    expect(result[2]).toEqual({ id: 1, name: "Queue 1", status: "open" });
  });

  it("should handle all closed queues sorted by ID descending", () => {
    const queues: QueueBase[] = [
      { id: 2, name: "Queue 2", status: "closed" },
      { id: 7, name: "Queue 7", status: "closed" },
      { id: 4, name: "Queue 4", status: "closed" },
    ];

    const result = sortQueues(queues);

    expect(result[0]).toEqual({ id: 7, name: "Queue 7", status: "closed" });
    expect(result[1]).toEqual({ id: 4, name: "Queue 4", status: "closed" });
    expect(result[2]).toEqual({ id: 2, name: "Queue 2", status: "closed" });
  });

  it("should handle empty array", () => {
    const queues: QueueBase[] = [];
    const result = sortQueues(queues);
    expect(result).toEqual([]);
  });

  it("should handle single queue", () => {
    const queues: QueueBase[] = [{ id: 1, name: "Queue 1", status: "open" }];
    const result = sortQueues(queues);
    expect(result).toEqual([{ id: 1, name: "Queue 1", status: "open" }]);
  });

  it("should handle queues with same ID but different status", () => {
    // Edge case: if somehow queues have same ID
    const queues: QueueBase[] = [
      { id: 1, name: "Queue 1 Closed", status: "closed" },
      { id: 1, name: "Queue 1 Open", status: "open" },
    ];

    const result = sortQueues(queues);

    expect(result[0]).toEqual({ id: 1, name: "Queue 1 Open", status: "open" });
    expect(result[1]).toEqual({
      id: 1,
      name: "Queue 1 Closed",
      status: "closed",
    });
  });

  it("should handle medium sized dataset with mixed statuses", () => {
    const queues: QueueBase[] = [
      { id: 10, name: "Queue 10", status: "closed" },
      { id: 15, name: "Queue 15", status: "open" },
      { id: 5, name: "Queue 5", status: "closed" },
      { id: 20, name: "Queue 20", status: "open" },
      { id: 1, name: "Queue 1", status: "open" },
      { id: 8, name: "Queue 8", status: "closed" },
    ];

    const result = sortQueues(queues);

    // All open queues first, sorted by ID descending
    expect(result[0]).toEqual({ id: 20, name: "Queue 20", status: "open" });
    expect(result[1]).toEqual({ id: 15, name: "Queue 15", status: "open" });
    expect(result[2]).toEqual({ id: 1, name: "Queue 1", status: "open" });

    // Then all closed queues, sorted by ID descending
    expect(result[3]).toEqual({ id: 10, name: "Queue 10", status: "closed" });
    expect(result[4]).toEqual({ id: 8, name: "Queue 8", status: "closed" });
    expect(result[5]).toEqual({ id: 5, name: "Queue 5", status: "closed" });
  });

  it("should handle queues with sequential IDs", () => {
    const queues: QueueBase[] = [
      { id: 1, name: "Queue 1", status: "closed" },
      { id: 2, name: "Queue 2", status: "open" },
      { id: 3, name: "Queue 3", status: "closed" },
      { id: 4, name: "Queue 4", status: "open" },
    ];

    const result = sortQueues(queues);

    expect(result[0]).toEqual({ id: 4, name: "Queue 4", status: "open" });
    expect(result[1]).toEqual({ id: 2, name: "Queue 2", status: "open" });
    expect(result[2]).toEqual({ id: 3, name: "Queue 3", status: "closed" });
    expect(result[3]).toEqual({ id: 1, name: "Queue 1", status: "closed" });
  });
});

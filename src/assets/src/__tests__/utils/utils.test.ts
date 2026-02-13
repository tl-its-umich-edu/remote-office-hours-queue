import { checkIfSetsAreDifferent, addMeetingAutoAssigned } from "../../utils";
import { QueueFull } from "../../models";
import * as api from "../../services/api";

jest.mock("../../services/api");

const mockedApi = jest.mocked(api);

describe("checkIfSetsAreDifferent", () => {
  it("should return true since count is greater than one", () => {
    const setA = new Set([1, 2, 3, "apple", "banana"])
    const diff = ["orange", "mango"]
    const setB = new Set([...setA, ...diff])
    expect(checkIfSetsAreDifferent(setA ,setB)).toBe(true);
  })
  it("should return false since count is zero", () => {
    const setA = new Set([1, 2, 3, "apple", "banana"])
    const setB = new Set([...setA])
    expect(checkIfSetsAreDifferent(setA ,setB)).toBe(false);
  })
})

describe("addMeetingAutoAssigned", () => {
  const mockQueue: QueueFull = {
    id: 1,
    name: "Test Queue",
    created_at: "2025-01-01T00:00:00Z",
    description: "Test description",
    allowed_backends: ["zoom"],
    inperson_location: "Office 123",
    status: "open",
    hosts: [
      { id: 100, username: "host1", first_name: "Host", last_name: "One" },
      { id: 101, username: "host2", first_name: "Host", last_name: "Two" }
    ]
  }

  const singleHostQueue: QueueFull = {
    id: 2,
    name: "Single Host Queue",
    created_at: "2025-01-01T00:00:00Z",
    description: "Test description",
    allowed_backends: ["zoom"],
    inperson_location: "Office 123",
    status: "open",
    hosts: [
      { id: 100, username: "host1", first_name: "Host", last_name: "One" }
    ]
  }

  it("should call api.addMeeting with undefined assignee when queue has multiple hosts", async () => {
    await addMeetingAutoAssigned(mockQueue, 123, "zoom");

    expect(mockedApi.addMeeting).toHaveBeenCalledWith(1, 123, "zoom", undefined);
  });

  it("should call api.addMeeting with host id as assignee when queue has single host", async () => {
    await addMeetingAutoAssigned(singleHostQueue, 123, "zoom");

    expect(mockedApi.addMeeting).toHaveBeenCalledWith(2, 123, "zoom", 100);
  });

  it("should call api.addMeeting with undefined assignee when queue has no hosts", async () => {
    const noHostQueue: QueueFull = {
      id: 3,
      name: "No Host Queue",
      created_at: "2025-01-01T00:00:00Z",
      description: "Test description",
      allowed_backends: ["zoom"],
      inperson_location: "Office 123",
      status: "open",
      hosts: []
    }

    await addMeetingAutoAssigned(noHostQueue, 123, "inperson");

    expect(mockedApi.addMeeting).toHaveBeenCalledWith(3, 123, "inperson", undefined);
  });

  it("should propagate api errors", async () => {
    const error = new Error("API Error");
    mockedApi.addMeeting.mockRejectedValue(error);

    await expect(addMeetingAutoAssigned(mockQueue, 123, "zoom")).rejects.toThrow("API Error");
  });
})
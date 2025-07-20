import { confirmUserExists, validatePhoneNumber, queueNameSchema, queueDescriptSchema, meetingAgendaSchema, queueLocationSchema, searchQuerySchema, validateString, validateMeetingTypes } from "../../validation";
import { MeetingBackend, QueueHost, MeetingStatus } from "../../models";
import * as api from "../../services/api";

jest.mock("../../services/api");

const mockedApi = jest.mocked(api);

describe("confirmUserExists", () => {
  it("should return user when getUser succeeds", async () => {
    const mockUser = { id: 1, username: "testuser", first_name: "Test", last_name: "User" };
    mockedApi.getUser.mockResolvedValue(mockUser);

    const result = await confirmUserExists("TestUser");

    expect(mockedApi.getUser).toHaveBeenCalledWith("testuser");
    expect(result).toEqual(mockUser);
  });

  it("should sanitize uniqname by trimming and lowercasing", async () => {
    const mockUser = { id: 1, username: "testuser", first_name: "Test", last_name: "User" };
    mockedApi.getUser.mockResolvedValue(mockUser);

    await confirmUserExists("  TestUser  ");

    expect(mockedApi.getUser).toHaveBeenCalledWith("testuser");
  });

  it("should throw custom error message when user not found", async () => {
    const notFoundError = new Error("Not found");
    notFoundError.name = "NotFoundError";
    mockedApi.getUser.mockRejectedValue(notFoundError);

    await expect(confirmUserExists("nonexistent")).rejects.toThrow(
      "nonexistent is not a valid user. Please make sure the uniqname is correct, and that they have logged onto Remote Office Hours Queue at least once."
    );
  });

  it("should propagate non-NotFoundError errors", async () => {
    const networkError = new Error("Network error");
    mockedApi.getUser.mockRejectedValue(networkError);

    await expect(confirmUserExists("testuser")).rejects.toThrow("Network error");
  });

  it("should handle errors without name property", async () => {
    const unknownError = { message: "Unknown error" };
    mockedApi.getUser.mockRejectedValue(unknownError);

    await expect(confirmUserExists("testuser")).rejects.toEqual(unknownError);
  });
})

describe("validatePhoneNumber", () => {
  it('should not return an error for valid US/Canada phone number', () => {
    const dummyDialCode = '1';
    const dummyPhone = '12345678901'; // 11 digits
    expect(validatePhoneNumber(dummyPhone, dummyDialCode)).toEqual([]);
  });

  it('should return an error for invalid US/Canada phone number', () => {
    const dummyDialCode = '1';
    const dummyPhone = '1234567890'; // 10 digits (missing country code)
    expect(validatePhoneNumber(dummyPhone, dummyDialCode)).toEqual([
      new Error('Please enter a valid US/Canada phone number with area code ' +
        '(11 digits including +1 country code) that can receive SMS messages.')
    ]);
  });

  it('should not return an error for non-US/Canada country codes', () => {
    const dummyDialCode = '44'; // UK
    const dummyPhone = '123456789'; // Any length should be valid for non-US/Canada
    expect(validatePhoneNumber(dummyPhone, dummyDialCode)).toEqual([]);
  });
});

describe("validateString", () => {
  it("should validate valid string", () => {
    const result = validateString("Valid Name", queueNameSchema, false);
    expect(result.isInvalid).toBe(false);
    expect(result.transformedValue).toBe("Valid Name");
  });

  it("should return error for empty required field", () => {
    const result = validateString("", queueNameSchema, false);
    expect(result.isInvalid).toBe(true);
    expect(result.messages).toContain("This field may not be left blank.");
  });

  it("should return error for string exceeding max length", () => {
    const longString = "a".repeat(101 );
    const result = validateString(longString, queueNameSchema, false);
    expect(result.isInvalid).toBe(true);
  });

  it("should show remaining characters when showRemaining is true", () => {
    const result = validateString("Test", queueNameSchema, true);
    expect(result.messages[0]).toContain("Remaining characters:");
  });
});

describe("queueNameSchema", () => {
  it("should validate valid queue name", () => {
    expect(() => queueNameSchema.validateSync("Valid Queue Name")).not.toThrow();
  });

  it("should reject empty string", () => {
    expect(() => queueNameSchema.validateSync("")).toThrow();
  });

  it("should reject string over 100 characters", () => {
    expect(() => queueNameSchema.validateSync("a".repeat(101))).toThrow();
  });
});

describe("queueDescriptSchema", () => {
  it("should validate valid description", () => {
    expect(() => queueDescriptSchema.validateSync("Valid description")).not.toThrow();
  });

  it("should allow empty string", () => {
    expect(() => queueDescriptSchema.validateSync("")).not.toThrow();
  });

  it("should reject string over 1000 characters", () => {
    expect(() => queueDescriptSchema.validateSync("a".repeat(1001))).toThrow();
  });
});

describe("meetingAgendaSchema", () => {
  it("should validate valid agenda", () => {
    expect(() => meetingAgendaSchema.validateSync("Discuss homework")).not.toThrow();
  });

  it("should allow empty string", () => {
    expect(() => meetingAgendaSchema.validateSync("")).not.toThrow();
  });

  it("should reject string over 100 characters", () => {
    expect(() => meetingAgendaSchema.validateSync("a".repeat(101))).toThrow();
  });
});

describe("queueLocationSchema", () => {
  it("should validate valid location", () => {
    expect(() => queueLocationSchema.validateSync("Room 123")).not.toThrow();
  });

  it("should allow empty string", () => {
    expect(() => queueLocationSchema.validateSync("")).not.toThrow();
  });

  it("should reject string over 100 characters", () => {
    expect(() => queueLocationSchema.validateSync("a".repeat(101))).toThrow();
  });
});

describe("searchQuerySchema", () => {
  it("should validate valid uniqname", () => {
    expect(() => searchQuerySchema.validateSync("testuser")).not.toThrow();
  });

  it("should validate valid email", () => {
    expect(() => searchQuerySchema.validateSync("test@example.com")).not.toThrow();
  });

  it("should reject uniqname with numbers", () => {
    expect(() => searchQuerySchema.validateSync("test123")).toThrow();
  });

  it("should reject uniqname too short", () => {
    expect(() => searchQuerySchema.validateSync("ab")).toThrow();
  });

  it("should reject uniqname too long", () => {
    expect(() => searchQuerySchema.validateSync("verylongname")).toThrow();
  });

  it("should reject invalid email", () => {
    expect(() => searchQuerySchema.validateSync("invalid@")).toThrow();
  });
});

describe("validateMeetingTypes", () => {
  const mockBackends: MeetingBackend[] = [
    { name: "zoom", friendly_name: "Zoom", enabled: true, docs_url: null, telephone_num: null, intl_telephone_url: null },
    { name: "inperson", friendly_name: "In-Person", enabled: true, docs_url: null, telephone_num: null, intl_telephone_url: null }
  ];

  it("should validate when at least one type is selected", () => {
    const result = validateMeetingTypes(new Set(["zoom"]), mockBackends);
    expect(result.isInvalid).toBe(false);
  });

  it("should return error when no types selected", () => {
    const result = validateMeetingTypes(new Set(), mockBackends);
    expect(result.isInvalid).toBe(true);
    expect(result.messages).toContain("You must select at least one allowed meeting type.");
  });

  it("should return error when removing type with existing meetings", () => {
    const mockQueue: QueueHost = {
      meeting_set: [
        { id: 1, backend_type: "zoom", status: MeetingStatus.ASSIGNED }
      ]
    } as QueueHost;

    const result = validateMeetingTypes(new Set(["inperson"]), mockBackends, mockQueue);
    expect(result.isInvalid).toBe(true);
    expect(result.messages[0]).toContain("You cannot disallow the following meeting types");
  });

  it("should allow removing type when no unstarted meetings exist", () => {
    const mockQueue: QueueHost = {
      meeting_set: [
        { id: 1, backend_type: "zoom", status: MeetingStatus.STARTED }
      ]
    } as QueueHost;

    const result = validateMeetingTypes(new Set(["inperson"]), mockBackends, mockQueue);
    expect(result.isInvalid).toBe(false);
  });
});
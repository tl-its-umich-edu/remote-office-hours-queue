import { confirmUserExists, validatePhoneNumber, queueNameSchema, queueDescriptSchema, meetingAgendaSchema, queueLocationSchema, searchQuerySchema, validateString, validateMeetingTypes } from "../../validation";
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
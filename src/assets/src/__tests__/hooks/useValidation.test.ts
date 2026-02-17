import { renderHook, act } from "@testing-library/react";
import { useStringValidation, useMeetingTypesValidation } from "../../hooks/useValidation";
import { queueNameSchema } from "../../validation";

describe("useStringValidation", () => {
  it("should initialize with undefined validation result", () => {
    const { result } = renderHook(() => useStringValidation(queueNameSchema, false));
    
    const [validationResult] = result.current;
    expect(validationResult).toBeUndefined();
  });

  it("should validate and return result", () => {
    const { result } = renderHook(() => useStringValidation(queueNameSchema, false));
    
    act(() => {
      const [, validateAndSet] = result.current;
      validateAndSet("Valid Name");
    });

    const [validationResult] = result.current;
    expect(validationResult?.isInvalid).toBe(false);
    expect(validationResult?.transformedValue).toBe("Valid Name");
  });

  it("should return error for invalid input", () => {
    const { result } = renderHook(() => useStringValidation(queueNameSchema, false));
    
    act(() => {
      const [, validateAndSet] = result.current;
      validateAndSet("");
    });

    const [validationResult] = result.current;
    expect(validationResult?.isInvalid).toBe(true);
  });

  it("should clear validation result", () => {
    const { result } = renderHook(() => useStringValidation(queueNameSchema, false));
    
    act(() => {
      const [, validateAndSet] = result.current;
      validateAndSet("Valid Name");
    });

    act(() => {
      const [, , clear] = result.current;
      clear();
    });

    const [validationResult] = result.current;
    expect(validationResult).toBeUndefined();
  });
});

describe("useMeetingTypesValidation", () => {
  const mockBackends = [
    { name: "zoom", friendly_name: "Zoom" },
    { name: "inperson", friendly_name: "In-Person" }
  ] as any[];

  it("should initialize with undefined validation result", () => {
    const { result } = renderHook(() => useMeetingTypesValidation(mockBackends));
    
    const [validationResult] = result.current;
    expect(validationResult).toBeUndefined();
  });

  it("should validate meeting types", () => {
    const { result } = renderHook(() => useMeetingTypesValidation(mockBackends));
    
    act(() => {
      const [, validateAndSet] = result.current;
      validateAndSet(new Set(["zoom"]));
    });

    const [validationResult] = result.current;
    expect(validationResult?.isInvalid).toBe(false);
  });

  it("should return error for empty set", () => {
    const { result } = renderHook(() => useMeetingTypesValidation(mockBackends));
    
    act(() => {
      const [, validateAndSet] = result.current;
      validateAndSet(new Set());
    });

    const [validationResult] = result.current;
    expect(validationResult?.isInvalid).toBe(true);
  });

  it("should clear validation result", () => {
    const { result } = renderHook(() => useMeetingTypesValidation(mockBackends));
    
    act(() => {
      const [, validateAndSet] = result.current;
      validateAndSet(new Set(["zoom"]));
    });

    act(() => {
      const [, , clear] = result.current;
      clear();
    });

    const [validationResult] = result.current;
    expect(validationResult).toBeUndefined();
  });
});

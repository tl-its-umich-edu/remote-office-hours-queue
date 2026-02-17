import { renderHook, act } from "@testing-library/react";
import { usePromise } from "../../hooks/usePromise";

describe("usePromise", () => {
  it("should initialize with loading false and no error", () => {
    const mockPromiseFn = jest.fn();
    const { result } = renderHook(() => usePromise(mockPromiseFn));
    
    const [, loading, error] = result.current;
    expect(loading).toBe(false);
    expect(error).toBeUndefined();
  });

  it("should set loading true when promise is executing", async () => {
    const mockPromiseFn = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    const { result } = renderHook(() => usePromise(mockPromiseFn));
    
    act(() => {
      const [doPromise] = result.current;
      doPromise();
    });

    const [, loading] = result.current;
    expect(loading).toBe(true);
  });

  it("should handle successful promise resolution", async () => {
    const mockResult = { data: "success" };
    const mockPromiseFn = jest.fn(() => Promise.resolve(mockResult));
    const mockOnSuccess = jest.fn();
    const { result } = renderHook(() => usePromise(mockPromiseFn, mockOnSuccess));
    
    await act(async () => {
      const [doPromise] = result.current;
      await doPromise();
    });

    expect(mockOnSuccess).toHaveBeenCalledWith(mockResult);
    expect(result.current[1]).toBe(false);
    expect(result.current[2]).toBeUndefined();
  });

  it("should handle promise rejection", async () => {
    const mockError = new Error("Test error");
    const mockPromiseFn = jest.fn(() => Promise.reject(mockError));
    const { result } = renderHook(() => usePromise(mockPromiseFn));
    
    await act(async () => {
      const [doPromise] = result.current;
      try {
        await doPromise();
      } catch (e) {
        // Expected to throw
      }
    });

    expect(result.current[1]).toBe(false);
    expect(result.current[2]).toBe(mockError);
  });

  it("should pass arguments to promise function", async () => {
    const mockPromiseFn = jest.fn((arg1: string, arg2: string) => Promise.resolve());
    const { result } = renderHook(() => usePromise(mockPromiseFn));
    
    await act(async () => {
      const [doPromise] = result.current;
      await doPromise("arg1", "arg2");
    });

    expect(mockPromiseFn).toHaveBeenCalledWith("arg1", "arg2");
  });
});

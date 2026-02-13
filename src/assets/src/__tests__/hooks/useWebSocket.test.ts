import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "../../hooks/useWebSocket";
import { WebSocket } from "partysocket";

jest.mock("partysocket");

const MockWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>;

describe("useWebSocket", () => {
  let mockWebSocket: jest.Mocked<WebSocket>;
  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocket = {
      onmessage: null,
      onclose: null,
      close: jest.fn(),
    } as any;
    MockWebSocket.mockImplementation(() => mockWebSocket);
  });

  it("should create WebSocket connection with correct URL", () => {
    renderHook(() => useWebSocket("ws://test-url", mockOnUpdate));
    
    expect(MockWebSocket).toHaveBeenCalledWith("ws://test-url", undefined, { maxRetries: 10 });
  });

  it("should handle init message", () => {
    renderHook(() => useWebSocket("ws://test-url", mockOnUpdate));
    
    const initMessage = { type: "init", content: { data: "test" } };
    
    act(() => {
      mockWebSocket.onmessage!({ data: JSON.stringify(initMessage) } as MessageEvent);
    });

    expect(mockOnUpdate).toHaveBeenCalledWith({ data: "test" });
  });

  it("should handle update message", () => {
    renderHook(() => useWebSocket("ws://test-url", mockOnUpdate));
    
    const updateMessage = { type: "update", content: { data: "updated" } };
    
    act(() => {
      mockWebSocket.onmessage!({ data: JSON.stringify(updateMessage) } as MessageEvent);
    });

    expect(mockOnUpdate).toHaveBeenCalledWith({ data: "updated" });
  });

  it("should handle deleted message with onDelete callback", () => {
    const { result } = renderHook(() => useWebSocket("ws://test-url", mockOnUpdate, mockOnDelete));
    
    const deletedMessage = { type: "deleted", content: null };
    
    act(() => {
      mockWebSocket.onmessage!({ data: JSON.stringify(deletedMessage) } as MessageEvent);
    });

    expect(mockOnDelete).toHaveBeenCalled();
  });

  it("should handle 4404 close code", () => {
    const { result } = renderHook(() => useWebSocket("ws://test-url", mockOnUpdate));
    
    act(() => {
      mockWebSocket.onclose!({ code: 4404 } as CloseEvent);
    });

    expect(result.current).toEqual(expect.any(Error));
    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it("should handle 4405 close code", () => {
    const { result } = renderHook(() => useWebSocket("ws://test-url", mockOnUpdate));
    
    act(() => {
      mockWebSocket.onclose!({ code: 4405 } as CloseEvent);
    });

    expect(result.current).toEqual(expect.any(Error));
  });

  it("should return undefined error initially", () => {
    const { result } = renderHook(() => useWebSocket("ws://test-url", mockOnUpdate));
    
    expect(result.current).toBeUndefined();
  });
});

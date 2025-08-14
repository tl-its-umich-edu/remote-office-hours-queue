import { renderHook, act } from "@testing-library/react";
import { useDialogState } from "../../hooks/useDialogState";

describe("useDialogState", () => {
  it("should initialize with dialog closed", () => {
    const { result } = renderHook(() => useDialogState());
    const [dialogState] = result.current;
    
    expect(dialogState.show).toBe(false);
  });

  it("should open dialog with provided parameters", () => {
    const { result } = renderHook(() => useDialogState());
    const mockAction = jest.fn();

    act(() => {
      const [, setStateAndOpenDialog] = result.current;
      setStateAndOpenDialog("Test Title", "Test Description", mockAction);
    });

    const [dialogState] = result.current;
    expect(dialogState.show).toBe(true);
    expect(dialogState.title).toBe("Test Title");
    expect(dialogState.description).toBe("Test Description");
  });

  it("should execute action and close dialog when action is called", () => {
    const { result } = renderHook(() => useDialogState());
    const mockAction = jest.fn();

    act(() => {
      const [, setStateAndOpenDialog] = result.current;
      setStateAndOpenDialog("Test Title", "Test Description", mockAction);
    });

    act(() => {
      const [dialogState] = result.current;
      dialogState.action!();
    });

    expect(mockAction).toHaveBeenCalled();
    expect(result.current[0].show).toBe(false);
  });

  it("should close dialog when onClose is called", () => {
    const { result } = renderHook(() => useDialogState());
    const mockAction = jest.fn();

    act(() => {
      const [, setStateAndOpenDialog] = result.current;
      setStateAndOpenDialog("Test Title", "Test Description", mockAction);
    });

    act(() => {
      const [dialogState] = result.current;
      dialogState.onClose!();
    });

    expect(result.current[0].show).toBe(false);
  });
});

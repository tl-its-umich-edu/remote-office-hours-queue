import { createRef, useEffect, RefObject } from "react";

export function useInitFocusRef<T extends HTMLElement>(initFocus: boolean): RefObject<T> | undefined {
    const ref = createRef<T>();
    if (!initFocus) return undefined;
    useEffect(() => {
        if (initFocus) ref.current!.focus();
    }, []);
    return ref;
}

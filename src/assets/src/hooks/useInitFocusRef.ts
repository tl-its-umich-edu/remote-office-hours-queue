import { createRef, useEffect, RefObject } from "react";

export function useInitFocusRef<T extends HTMLElement>(initFocus: boolean): RefObject<T> | undefined {
    if (!initFocus) return undefined;
    const ref = createRef<T>();
    useEffect(() => {
        if (initFocus) ref.current!.focus();
    }, []);
    return ref;
}

import { useEffect, useRef } from "react";


// https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state

export function usePreviousState(value: any): any {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

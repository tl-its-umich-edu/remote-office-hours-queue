import { useState, useEffect } from "react";

interface OfficeHoursMessage<T> {
    type: "init"|"update"|"deleted";
    content: T;
}

const closeCodes = {
    1006: "An unexpected error occurred. Please refresh the page.",
    4404: "The resource you're looking for could not be found. Maybe it was deleted?",
} as {[closeCode: number]: string}

export const useWebSocket = <T>(url: string, update: (content: T) => void, handleDeleted=true) => {
    const [error, setError] = useState(undefined as Error | undefined);
    useEffect(() => {
        const ws = new WebSocket(url);
        ws.onmessage = (e: MessageEvent) => {
            const m = JSON.parse(e.data) as OfficeHoursMessage<T>;
            console.log(m);
            switch(m.type) {
                case "init":
                    update(m.content as T);
                    break;
                case "update":
                    update(m.content as T);
                    break;
                case "deleted":
                    if (handleDeleted) update(undefined!);
                    else throw new Error("Unexpected message type 'deleted': " + e);
                    break;
            }
        }
        ws.onclose = (e: CloseEvent) => {
            console.error(e);
            setError(new Error(closeCodes[e.code] ?? e.code.toString()));
        }
        ws.onerror = (e: Event) => {
            console.error(e);
            setError(new Error(e.toString()));
        }
        return () => {
            ws.close();
        }
    }, []);
    return error;
}

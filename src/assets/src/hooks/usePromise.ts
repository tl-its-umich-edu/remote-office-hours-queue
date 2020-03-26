import { useState } from "react";

export const usePromise = <T, F extends (...args: any) => Promise<T>>(
    task: F, 
    set?: (value: T) => void
): [(...args: Parameters<F>) => Promise<void>, boolean, Error | undefined] => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(undefined as Error | undefined);
    const doTask = (args: Parameters<F>) => {
        setIsLoading(true);
        return task(args)
            .then((data: T) => {
                set && set(data);
            })
            .catch((error: Error) => {
                console.error(error);
                setError(error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }
    return [doTask, isLoading, error];
}

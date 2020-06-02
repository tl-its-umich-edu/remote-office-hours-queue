import { useState } from "react";

export const usePromise = <T, F extends (...args: any) => Promise<T>>(
    task: F, 
    set?: (value: T) => void
): [(...args: Parameters<F>) => Promise<void>, boolean, Error | undefined] => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(undefined as Error | undefined);
    const doTask = async (...args: Parameters<F>) => {
        setIsLoading(true);
        try {
            const data = await task(...args as any)
            set && set(data);
            setError(undefined);
        } catch(error) {
            console.error(error);
            setError(error as Error);
        } finally {
            setIsLoading(false);
        }
    }
    return [doTask, isLoading, error];
}

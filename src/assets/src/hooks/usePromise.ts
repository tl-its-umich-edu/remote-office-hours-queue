import { useState, useEffect } from "react";

export function pagePromise<T>(
    task: () => Promise<any>, 
    setValue: (value: T) => void, 
    setIsLoading: (isLoading: boolean) => void,
    setError: (error: Error) => void
): Promise<void> {
    setIsLoading(true);
    return task()
        .then((data: T) => {
            setValue(data);
        })
        .catch((error: Error) => {
            console.error(error);
            setError(error);
        })
        .finally(() => {
            setIsLoading(false);
        });
}

export const usePromise = <T>(task: () => Promise<T>, set: (value: T) => void): [() => Promise<void>, boolean, Error | undefined] => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(undefined as Error | undefined);
    const doTask = () => pagePromise(task, set, setIsLoading, setError);
    return [doTask, isLoading, error];
}

export const usePromiseInit = <T>(task: () => Promise<T>, set: (value: T) => void): [() => Promise<void>, boolean, Error | undefined] => {
    const [doTask, isLoading, error] = usePromise(task, set);
    useEffect(() => {
        doTask();
    }, []);
    return [doTask, isLoading, error];
}

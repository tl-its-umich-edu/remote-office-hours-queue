export function pageTaskAsync<T>(
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

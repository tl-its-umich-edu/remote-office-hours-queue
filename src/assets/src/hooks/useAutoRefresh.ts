import { useState, useEffect } from "react";
import { Subject, interval, merge } from "rxjs";
import { debounceTime, map, withLatestFrom, filter, tap } from "rxjs/operators";

export const useAutoRefresh = (refresh: () => void, intervalMs=3000) => {
    const [interactions] = useState(() => {
        const subj = new Subject<boolean>();
        return subj;
    });
    const [interactionsEnable] = useState(() => {
        return interactions.pipe(
            debounceTime(intervalMs * 2),
            map(() => true),
        );
    });
    useEffect(() => {
        const subscription = interval(intervalMs).pipe(
            withLatestFrom(merge(interactions, interactionsEnable)),
            map(v => v[1]),
            filter((v) => v),
        ).subscribe(() => {
            refresh()
        });
        interactions.next(true);
        return () => {
            subscription.unsubscribe();
        }
    }, []);
    return [interactions]
}

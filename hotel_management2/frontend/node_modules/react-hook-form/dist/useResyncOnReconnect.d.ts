export declare const cloneFormState: <T extends {
    defaultValues?: unknown;
}>({ defaultValues, ...formState }: T) => T;
export declare function useResyncOnReconnect<T>(getInitialValue?: () => T, clone?: (value: T) => T): {
    resyncIfNeeded: (enabled: boolean, getCurrentValue: () => T, setValue: (value: T) => void) => void;
    snapshot: (enabled: boolean, getCurrentValue: () => T) => void;
};
//# sourceMappingURL=useResyncOnReconnect.d.ts.map
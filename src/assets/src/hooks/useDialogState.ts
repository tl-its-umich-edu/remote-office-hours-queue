import { useState } from 'react';
import { DialogState } from '../components/common'

export function useDialogState (): [
    DialogState, (title: string, description: string, action: () => void) => void
] {
    const [dialogState, setDialogState] = useState<DialogState>({ show: false })

    const resetDialogState = () => {
        setDialogState({ show: false })
    }

    const setStateAndOpenDialog = (
        title: string, description: string, action: () => void
    ) => {
        setDialogState({
            show: true,
            title,
            description,
            action,
            onClose: resetDialogState
        })
    }

    return [dialogState, setStateAndOpenDialog]
}

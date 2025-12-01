import { useContext } from 'react';
import { ToastContext } from '../context/ToastProvider';

export function useToast() {
    return useContext(ToastContext);
}

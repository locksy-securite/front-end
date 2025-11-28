import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeProvider';

export function useTheme() {
    return useContext(ThemeContext);
}
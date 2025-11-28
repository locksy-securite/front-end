import { createContext, useEffect, useState } from 'react';

// Contexte pour exposer le thème et les actions
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Initialiser directement le state avec localStorage
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'system';
    });

    // Appliquer le thème choisi
    const applyTheme = (selectedTheme) => {
        if (selectedTheme === 'system') {
            const prefersDark = window.matchMedia(
                '(prefers-color-scheme: dark)'
            ).matches;
            const systemTheme = prefersDark ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', systemTheme);
        } else {
            document.documentElement.setAttribute('data-theme', selectedTheme);
        }
    };

    // Synchroniser le thème au montage et écouter les changements système
    useEffect(() => {
        applyTheme(theme);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            if (theme === 'system') {
                const newTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    // Changer et sauvegarder le thème
    const changeTheme = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export { ThemeContext };
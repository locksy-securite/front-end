import { useTheme } from '../hooks/useTheme';

export default function ThemeSelector() {
    const { theme, changeTheme } = useTheme();

    // Mapping des valeurs vers libellés
    const themeLabels = {
        system: 'Défaut système',
        light: 'Clair',
        dark: 'Sombre',
    };

    return (
        <div className="dropdown">
            <label tabIndex={0} className="btn btn-secondary m-1">
                Thème • {themeLabels[theme]}
            </label>
            <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-1 shadow-sm"
            >
                <li>
                    <button onClick={() => changeTheme('system')}>Défaut système</button>
                </li>
                <li>
                    <button onClick={() => changeTheme('light')}>Clair</button>
                </li>
                <li>
                    <button onClick={() => changeTheme('dark')}>Sombre</button>
                </li>
            </ul>
        </div>
    );
}
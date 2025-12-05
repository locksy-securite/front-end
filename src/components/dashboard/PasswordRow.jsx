export default function PasswordRow({ password, isActive, onSelect }) {
    return (
        <li
            className={`list-row rounded-box px-4 py-2 cursor-pointer transition-colors 
                ${isActive ? 'bg-base-100 shadow-sm' : 'hover:bg-base-200'}`}
            onClick={() => onSelect(password)}
            role="button"
            aria-pressed={isActive}
            aria-label={`Sélectionner le mot de passe ${password.name}`}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    onSelect(password);
                }
            }}
        >
            <div>
                {/* Nom du mot de passe */}
                <div className="font-semibold">{password.name}</div>

                {/* Identifiant (username) */}
                <div
                    className="text-xs opacity-75 truncate"
                    title={password.username}
                >
                    {password.username}
                </div>
            </div>
        </li>
    );
}

export default function AccountDropdown({ email, onLogout }) {
    return (
        <div className="dropdown dropdown-end dropdown-hover">
            {/* Bouton rond avec icône compte */}
            <div
                tabIndex={0}
                role="button"
                aria-label="Menu compte utilisateur"
                className="btn btn-circle btn-secondary"
            >
                <img
                    src="/compte.svg"
                    alt="Icône compte utilisateur"
                    className="w-5 h-5"
                />
            </div>

            {/* Contenu du dropdown */}
            <div
                tabIndex={-1}
                className="dropdown-content bg-base-100 rounded-box z-10 w-56 shadow-sm"
            >
                {/* Bloc d'information non cliquable */}
                <div className="text-center border-b border-base-300 p-2">
                    <p className="text-sm text-base-content/70">
                        Connecté en tant que
                    </p>
                    <p className="truncate font-medium" title={email}>
                        {email}
                    </p>
                </div>

                {/* Menu interactif */}
                <ul className="menu w-full p-1" role="menu">
                    <li role="menuitem">
                        <button
                            onClick={onLogout}
                            className="text-error font-semibold"
                            aria-label="Se déconnecter"
                        >
                            Déconnexion
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    );
}

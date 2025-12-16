# Locksy • Front-end React

---

### Présentation

La partie **frontend** de l'application Locksy est développée en **React** avec **Vite**, destinée à la gestion sécurisée des mots de passe, notes et cartes bancaires.

Elle offre une interface moderne et intuitive grâce à **TailwindCSS** et **DaisyUI**, tout en intégrant des bonnes pratiques de développement (ESLint, Prettier, React Query, Axios).

---

### Table des matières

-   [Prérequis](#prérequis)
-   [Dépendances principales](#dépendances-principales)
-   [Installation et configuration](#installation-et-configuration)
-   [Scripts disponibles](#scripts-disponibles)
-   [Sécurité et modèle zero knowledge](#sécurité-et-modèle-zero-knowledge)
-   [Structure du projet](#structure-du-projet)

---

### Prérequis

-   **Node.js** (version 16+ recommandée)
-   **npm** (fourni avec Node.js)
-   Ligne de commande (Terminal, PowerShell, Bash)
-   Navigateur moderne (Chrome, Edge, Firefox)

---

### Dépendances principales

-   **vite** : bundler rapide et moderne
-   **react** / **react-dom** : bibliothèque UI
-   **react-router-dom** : routage SPA
-   **axios** : requêtes HTTP
-   **@tanstack/react-query** : gestion des données côté client
-   **tailwindcss** : framework CSS utilitaire
-   **daisyui** : composants UI pré-stylés pour Tailwind
-   **argon2-browser** : dérivation de clé côté client (WASM)
-   **argon2-wasm-pro** : alternative performante pour Argon2id
-   **zxcvbn** : estimation de la force des mots de passe
-   **dompurify** : sanitization des contenus HTML pour prévenir les attaques XSS
-   **eslint** + **eslint-config-prettier** _(dev)_ : linting et cohérence du code
-   **prettier** _(dev)_ : formatage automatique
-   **@vitejs/plugin-react** _(dev)_ : intégration React avec Vite
-   **axios-mock-adapter** _(dev)_ : simulation de backend pour les tests

---

### Installation et configuration

1. Cloner le projet :
```bash
git clone https://github.com/locksy-securite/front-end.git
cd front-end
```

2. Installer les dépendances :
```bash
npm install
```

3. Ajouter un fichier d'environnement `.env` (exemple) :
```
VITE_API_URL={API_URL}
VITE_MOCK_BACKEND={true ou false}
```
- **VITE_API_URL** : URL de base utilisée par Axios pour communiquer avec le backend (/api en développement local)
- **VITE_MOCK_BACKEND** : booléen (true ou false) qui active le backend mocké uniquement si l'application est lancée en mode développement (import.meta.env.DEV) et que la variable est définie à true, avec une valeur par défaut false si elle n'est pas précisée

⚠️ **Important** : si vous avez lancé le front avec le mock backend activé (`VITE_MOCK_BACKEND=true`) et que vous le désactivez ensuite pour utiliser le vrai backend, pensez à **supprimer les données stockées par le mock dans le localStorage** (via les DevTools du navigateur) afin d'éviter tout conflit avec les données du backend.

4. Lancer le serveur de développement :
```bash
npm run dev
```

---

### Scripts disponibles

-   `npm run dev` → lance le serveur Vite en mode développement
-   `npm run build` → construit l'application pour la production
-   `npm run lint` → analyse le code avec ESLint
-   `npm run preview` → prévisualise la version de production
-   `npm run format` → reformate le code avec Prettier

---

### Sécurité et modèle zero knowledge

Locksy repose sur un modèle **zero‑knowledge** : le serveur ne connaît jamais les clés ni les secrets, et toutes les opérations cryptographiques sont réalisées directement dans le navigateur.

-   **Chiffrement côté client (AES‑256‑GCM)**  
    Les données sensibles sont chiffrées localement avec AES‑256‑GCM.  
    Chaque élément utilise un nonce aléatoire et des métadonnées (AAD) pour assurer confidentialité, intégrité et protection contre les attaques par rejouabilité.  
    Le serveur ne stocke que le ciphertext et les métadonnées, jamais les clés.
    
-   **Dérivation des clés (Argon2id)**  
    La clé maître est dérivée du mot de passe utilisateur via Argon2id en WebAssembly, avec un sel unique fourni à l'inscription.  
    Elle reste uniquement en mémoire côté client et n'est jamais transmise.  
    Ce mécanisme rend les attaques par dictionnaire ou par GPU/ASIC beaucoup plus coûteuses.
    
-   **Sous‑clés indépendantes (HKDF)**  
    À partir de la clé maître, Locksy dérive plusieurs sous‑clés spécifiques (connexion, coffre de mots de passe, notes, etc.).  
    Chaque sous‑clé est isolée : un compromis n'affecte pas les autres.  
    Cela garantit un compartimentage cryptographique robuste.
    
-   **Enveloppes versionnées**  
    Les données chiffrées sont encapsulées dans une enveloppe JSON décrivant la version, les algorithmes et les paramètres utilisés.  
    Ce format auto‑descriptif assure la compatibilité future et permet de migrer vers de nouveaux algorithmes sans perte de données.
    
-   **Connexion zero‑knowledge**  
    Lors du login, aucune donnée sensible n'est transmise.  
    Le client prouve la possession de la clé maître en générant une enveloppe chiffrée minimale, que le serveur peut vérifier sans jamais connaître le mot de passe.
    
-   **Évaluation des passphrases (zxcvbn)**  
    À l'inscription, la robustesse des mots de passe est évaluée avec zxcvbn.  
    L'utilisateur est encouragé à choisir une phrase longue et complexe, avec un retour en temps réel sur la force et des conseils d'amélioration.

-   **Vérification contre les fuites (HaveIBeenPwned)**  
    À l'inscription, Locksy interroge HaveIBeenPwned en mode k‑anonymity.  
    Seul un préfixe du hash SHA‑1 est transmis, garantissant la confidentialité.  
    Si le mot de passe figure dans des fuites connues, l'utilisateur est averti ou bloqué afin d'éviter toute réutilisation compromise.

---

### Structure du projet

```
front-end/
├── .github/workflows                       # pipelines CI/CD
├── public/                                 # ressources statiques
├── src/
│   ├── assets/                             # images et icônes internes
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── AccountDropdown.jsx         # menu utilisateur (profil, déconnexion)
│   │   │   ├── Header.jsx                  # barre supérieure du dashboard
│   │   │   ├── PasswordRow.jsx             # ligne individuelle d'un mot de passe
│   │   │   ├── PasswordList.jsx            # liste des mots de passe affichés et formulaire d'ajout / modification
│   │   │   └── SideBar.jsx                 # barre latérale de navigation
│   │   ├── EmailInput.jsx                  # champ email avec validation
│   │   ├── LoginForm.jsx                   # formulaire de connexion sécurisé
│   │   ├── PasswordInput.jsx               # champ mot de passe avec validation
│   │   ├── RangeSlider.jsx                 # curseur de sélection numérique
│   │   ├── RegisterForm.jsx                # formulaire d'inscription sécurisé
│   │   ├── RequireAuth.jsx                 # wrapper pour protéger les routes privées
│   │   ├── TextInput.jsx                   # champ texte générique
│   │   ├── ThemeSelector.jsx               # sélection du thème (UI)
│   │   ├── ToastAlert.jsx                  # notifications utilisateur (sanitisées avec DOMPurify)
│   │   └── Toggle.jsx                      # interrupteur activé/désactivé
│   ├── context/
│   │   ├── authContext.js                  # définition du contexte d'authentification
│   │   ├── AuthProvider.jsx                # provider pour gérer l'état d'authentification
│   │   ├── cryptoContext.js                # contexte cryptographique
│   │   ├── CryptoProvider.jsx              # gestion centralisée des clés
│   │   ├── ThemeProvider.jsx               # gestion du thème
│   │   └── ToastProvider.jsx               # gestion des notifications
│   ├── hooks/
│   │   ├── useAuth.js                      # hook pour accéder au contexte d'authentification
│   │   ├── useCrypto.js                    # hook pour accéder aux clés
│   │   ├── useTheme.js                     # hook pour le thème
│   │   └── useToast.js                     # hook pour les notifications
│   ├── layouts/
│   │   └── DashboardLayout.jsx             # layout principal du dashboard (header + sidebar + contenu)
│   ├── lib/
│   │   └── api.js                          # wrapper pour les appels API (axios)
│   ├── pages/
│   │   ├── dashboard/
│   │   │   ├── PasswordGeneratorPage.jsx   # page pour générer des mots de passe sécurisés avec options
│   │   │   └── PasswordsPage.jsx           # page listant et gérant les mots de passe
│   │   ├── HomePage.jsx                    # page d'accueil
│   │   ├── LoginPage.jsx                   # page de connexion
│   │   └── RegisterPage.jsx                # page d'inscription
│   ├── utils/
│   │   ├── cryptoKeys.js                   # utilitaires HKDF et dérivation
│   │   └── pwned.js                        # vérification des mots de passe via l'API HIBP (k-anonymity)
│   ├── App.css                             # styles globaux (Tailwind/DaisyUI)
│   ├── App.jsx                             # composant racine et routes
│   ├── index.css                           # styles de main.jsx
│   ├── main.jsx                            # point d'entrée React/Vite
│   └── mockBackend.js                      # backend simulé pour tests
├── .prettierrc                             # règles Prettier (formatage)
├── .prettierignore                         # fichiers ignorés par Prettier
├── Dockerfile                              # configuration Docker pour le déploiement
├── eslint.config.js                        # règles ESLint (qualité du code)
├── index.html                              # template HTML principal
├── package.json                            # scripts et dépendances du projet
├── package-lock.json                       # verrouillage des versions exactes des dépendances
└── vite.config.js                          # configuration Vite
```
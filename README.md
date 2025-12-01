# Locksy • Front-end React

---

### Présentation

La partie **frontend** de l'application Locksy est développée en **React** avec **Vite**, destinée à la gestion sécurisée des mots de passe, notes et cartes bancaires.

Elle offre une interface moderne et intuitive grâce à **TailwindCSS** et **DaisyUI**, tout en intégrant des bonnes pratiques de développement (ESLint, Prettier, React Query, Axios).

Sur le plan **sécurité**, Locksy applique un modèle *zero-knowledge* :  
- Les données sensibles sont **chiffrées côté client** avec **AES-GCM**.  
- Les clés sont dérivées via **Argon2id** et ne quittent jamais le navigateur.  
- La structure de stockage est versionnée et auto-descriptive, garantissant une compatibilité future.  
- La force des mots de passe est évaluée avec **zxcvbn** pour inciter à l’usage de passphrases robustes. 

---

### Table des matières

-   [Prérequis](#prérequis)
-   [Dépendances principales](#dépendances-principales)
-   [Installation et configuration](#installation-et-configuration)
-   [Scripts disponibles](#scripts-disponibles)
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

3. Lancer le serveur de développement :
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

### Structure du projet

```
front-end/
├── .github/workflows       # pipelines CI/CD
├── public/                 # ressources statiques
├── src/
│   ├── assets/                     # images et icônes internes
│   ├── components/
│   │   ├── EmailInput.jsx          # champ email avec validation
│   │   ├── PasswordInput.jsx       # champ mot de passe avec validation
│   │   ├── RegisterForm.jsx        # formulaire d'inscription sécurisé
│   │   ├── LoginForm.jsx           # formulaire de connexion sécurisé
│   │   ├── ThemeSelector.jsx       # sélection du thème (UI)
│   │   └── ToastAlert.jsx          # notifications utilisateur (sanitisées avec DOMPurify)
│   ├── context/
│   │   ├── cryptoContext.js        # contexte cryptographique
│   │   ├── CryptoProvider.jsx      # gestion centralisée des clés
│   │   ├── ThemeProvider.jsx       # gestion du thème
│   │   └── ToastProvider.jsx       # gestion des notifications
│   ├── hooks/
│   │   ├── useCrypto.js            # hook pour accéder aux clés
│   │   ├── useTheme.js             # hook pour le thème
│   │   └── useToast.js             # hook pour les notifications
│   ├── pages/
│   │   ├── HomePage.jsx            # page d'accueil
│   │   ├── LoginPage.jsx           # page de connexion
│   │   └── RegisterPage.jsx        # page d'inscription
│   ├── utils/
│   │   └── cryptoKeys.js           # utilitaires HKDF et dérivation
│   ├── App.jsx                     # composant racine et routes
│   ├── main.jsx                    # point d'entrée React/Vite
│   ├── App.css                     # styles globaux (Tailwind/DaisyUI)
│   ├── index.css                   # styles de main.jsx
│   └── mockBackend.js              # backend simulé pour tests
├── index.html              # template HTML principal
├── eslint.config.js        # règles ESLint (qualité du code)
├── .prettierrc             # règles Prettier (formatage)
├── .prettierignore         # fichiers ignorés par Prettier
├── package.json            # scripts et dépendances du projet
├── package-lock.json       # verrouillage des versions exactes des dépendances
└── vite.config.js          # configuration Vite
```
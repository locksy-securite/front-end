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
-   **eslint** + **eslint-config-prettier** _(dev)_ : linting et cohérence du code
-   **prettier** _(dev)_ : formatage automatique
-   **@vitejs/plugin-react** _(dev)_ : intégration React avec Vite

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
│   ├── assets/             # images et icônes internes
│   ├── App.jsx             # composant racine et routes
│   ├── main.jsx            # point d'entrée React/Vite
│   ├── App.css             # styles globaux (Tailwind/DaisyUI)
│   └── index.css           # styles de main.jsx
├── index.html              # template HTML principal
├── eslint.config.js        # règles ESLint (qualité du code)
├── .prettierrc             # règles Prettier (formatage)
├── .prettierignore         # fichiers ignorés par Prettier
├── package.json            # scripts et dépendances du projet
└── vite.config.js          # configuration Vite
```
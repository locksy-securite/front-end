import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

// Helpers pour persister les comptes
function loadUsers() {
    return JSON.parse(localStorage.getItem('mockUsers') || '{}');
}
function saveUsers(users) {
    localStorage.setItem('mockUsers', JSON.stringify(users));
}

export default function setupMock() {
    const mock = new AxiosMockAdapter(axios, { delayResponse: 500 });

    // Charger l’état depuis localStorage
    let users = loadUsers(); // { email: { salt_b64, password_hash_b64 } }

    // ---------------------------
    // Mock inscription
    // ---------------------------
    mock.onPost('/api/auth/register').reply((config) => {
        const { email, password_hash_b64, salt_b64 } = JSON.parse(config.data);

        if (email === 'error@test.com') {
            return [500, { message: 'Mock: erreur serveur.' }];
        }

        if (users[email]) {
            return [400, { message: 'Mock: email déjà utilisé.' }];
        }

        // Stocker email + salt + hash
        users[email] = { salt_b64, password_hash_b64 };
        saveUsers(users);

        return [200, { message: 'Mock: compte créé avec succès.' }];
    });

    // ---------------------------
    // Mock récupération du salt
    // ---------------------------
    mock.onPost('/api/auth/salt').reply((config) => {
        const { email } = JSON.parse(config.data);

        if (!users[email]) {
            return [404, { message: 'Mock: identifiants incorrects.' }];
        }

        return [200, { salt_b64: users[email].salt_b64 }];
    });

    // ---------------------------
    // Mock connexion
    // ---------------------------
    mock.onPost('/api/auth/login').reply((config) => {
        const { email, password_hash_b64 } = JSON.parse(config.data);

        if (!users[email]) {
            return [401, { message: 'Mock: identifiants incorrects.' }];
        }

        // Vérifier le hash
        if (users[email].password_hash_b64 !== password_hash_b64) {
            return [401, { message: 'Mock: identifiants incorrects.' }];
        }

        if (email === 'locked@test.com') {
            return [403, { message: 'Mock: compte verrouillé.' }];
        }

        return [200, { message: 'Mock: connexion réussie.' }];
    });

    return mock;
}

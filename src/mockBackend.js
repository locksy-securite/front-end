import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from './lib/api'; // <-- ajout : mock aussi pour l'instance 'api'

// Helpers pour persister les comptes
function loadUsers() {
    return JSON.parse(localStorage.getItem('mockUsers') || '{}');
}
function saveUsers(users) {
    localStorage.setItem('mockUsers', JSON.stringify(users));
}

// Passwords per user
function loadPasswordsFor(email) {
    return JSON.parse(localStorage.getItem(`mockPasswords:${email}`) || '[]');
}
function savePasswordsFor(email, list) {
    localStorage.setItem(`mockPasswords:${email}`, JSON.stringify(list));
}

// Session helper (simule cookie refresh côté mock via localStorage)
function setMockSession(email) {
    localStorage.setItem('mockSession', email);
}
function clearMockSession() {
    localStorage.removeItem('mockSession');
}
function getMockSession() {
    return localStorage.getItem('mockSession') || null;
}

// Utilitaire simple id
function makeId() {
    return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// Helpers pour persister les comptes
function loadUsers() {
    return JSON.parse(localStorage.getItem('mockUsers') || '{}');
}
function saveUsers(users) {
    localStorage.setItem('mockUsers', JSON.stringify(users));
}

export default function setupMock() {
    // two adapters: one for default axios, one for the api instance
    const mock = new AxiosMockAdapter(axios, { delayResponse: 400 });
    const mockApi = new AxiosMockAdapter(api, { delayResponse: 400 });

    // Charger l’état depuis localStorage
    let users = loadUsers(); // { email: { salt_b64, password_hash_b64 } }

    // small helpers
    const ok = (body = {}) => [200, body];
    const created = (body = {}) => [201, body];
    const badRequest = (msg = 'Bad request') => [400, { message: msg }];
    const unauthorized = (msg = 'Unauthorized') => [401, { message: msg }];
    const forbidden = (msg = 'Forbidden') => [403, { message: msg }];
    const notFound = (msg = 'Not found') => [404, { message: msg }];
    const serverError = (msg = 'Server error') => [500, { message: msg }];

    //
    // Handlers (single implementation, attached to both adapters)
    //
    const registerHandler = (config) => {
        try {
            const { email, password_hash_b64, salt_b64 } = JSON.parse(
                config.data
            );
            if (!email || !password_hash_b64 || !salt_b64) {
                return badRequest("Données d'inscription incomplètes.");
            }

            if (email === 'error@test.com') {
                return serverError('Mock: erreur serveur.');
            }

            users = loadUsers(); // reload
            if (users[email]) {
                return badRequest('Mock: email déjà utilisé.');
            }

            users[email] = { salt_b64, password_hash_b64 };
            saveUsers(users);

            return ok({ message: 'Mock: compte créé avec succès.' });
        } catch {
            return serverError('Mock: payload invalide.');
        }
    };

    const saltHandler = (config) => {
        try {
            const { email } = JSON.parse(config.data);
            users = loadUsers();
            if (!users[email]) {
                return notFound('Mock: identifiants incorrects.');
            }
            return ok({ salt_b64: users[email].salt_b64 });
        } catch {
            return serverError('Mock: payload invalide.');
        }
    };

    const loginHandler = (config) => {
        try {
            const { email, password_hash_b64 } = JSON.parse(config.data);
            users = loadUsers();
            if (!users[email]) {
                return unauthorized('Mock: identifiants incorrects.');
            }
            if (users[email].password_hash_b64 !== password_hash_b64) {
                return unauthorized('Mock: identifiants incorrects.');
            }
            if (email === 'locked@test.com') {
                return forbidden('Mock: compte verrouillé.');
            }

            // créer "session" côté mock et renvoyer accessToken + user
            setMockSession(email);
            const accessToken = `mock-access-${email}-${Math.floor(Math.random() * 100000)}`;
            const user = { email };

            return ok({
                message: 'Mock: connexion réussie.',
                accessToken,
                user,
            });
        } catch {
            return serverError('Mock: payload invalide.');
        }
    };

    const refreshHandler = () => {
        const email = getMockSession();
        if (!email) return unauthorized('No session');
        const accessToken = `mock-access-${email}-${Math.floor(Math.random() * 100000)}`;
        const user = { email };
        return ok({ accessToken, user });
    };

    const logoutHandler = () => {
        clearMockSession();
        return ok({ message: 'Mock: déconnecté.' });
    };

    const getPasswordsHandler = () => {
        const email = getMockSession();
        if (!email) return unauthorized('Not authenticated (mock).');
        const list = loadPasswordsFor(email);
        return ok(list);
    };

    const postPasswordsHandler = (config) => {
        const email = getMockSession();
        if (!email) return unauthorized('Not authenticated (mock).');
        try {
            const payload = JSON.parse(config.data);
            const { name, username, secret } = payload;
            if (!name || !secret)
                return badRequest('name and secret required.');

            const list = loadPasswordsFor(email);
            const id = makeId();
            const item = {
                id_password: id,
                name,
                username: username || '',
                secret,
            };
            list.unshift(item);
            savePasswordsFor(email, list);
            return created(item);
        } catch {
            return serverError('Mock: payload invalide.');
        }
    };

    const putPasswordsHandler = (config) => {
        const email = getMockSession();
        if (!email) return unauthorized('Not authenticated (mock).');
        try {
            const url = config.url || '';
            const parts = url.split('/');
            const id = parts[parts.length - 1];
            if (!id) return badRequest('Missing id in URL.');

            const payload = JSON.parse(config.data);
            const { name, username, secret } = payload;
            const list = loadPasswordsFor(email);
            const idx = list.findIndex(
                (p) => String(p.id_password) === String(id)
            );
            if (idx === -1) return notFound('Mot de passe introuvable.');

            list[idx] = {
                ...list[idx],
                name: name ?? list[idx].name,
                username: username ?? list[idx].username,
                secret: secret ?? list[idx].secret,
            };
            savePasswordsFor(email, list);
            return ok(list[idx]);
        } catch {
            return serverError('Mock: payload invalide.');
        }
    };

    const deletePasswordsHandler = (config) => {
        const email = getMockSession();
        if (!email) return unauthorized('Not authenticated (mock).');
        try {
            const url = config.url || '';
            const parts = url.split('/');
            const id = parts[parts.length - 1];
            if (!id) return badRequest('Missing id in URL.');

            let list = loadPasswordsFor(email);
            const idx = list.findIndex(
                (p) => String(p.id_password) === String(id)
            );
            if (idx === -1) return notFound('Mot de passe introuvable.');

            const removed = list.splice(idx, 1)[0];
            savePasswordsFor(email, list);
            return ok({ id: removed.id_password });
        } catch {
            return serverError('Mock: payload invalide.');
        }
    };

    //
    // Attach same handlers to both adapters (default axios + api instance)
    //

    // register
    mock.onPost('/api/auth/register').reply(registerHandler);
    mock.onPost('/auth/register').reply(registerHandler);
    mockApi.onPost('/auth/register').reply(registerHandler);
    mockApi.onPost('/api/auth/register').reply(registerHandler);

    // salt
    mock.onPost('/api/auth/salt').reply(saltHandler);
    mock.onPost('/auth/salt').reply(saltHandler);
    mockApi.onPost('/auth/salt').reply(saltHandler);
    mockApi.onPost('/api/auth/salt').reply(saltHandler);

    // login
    mock.onPost('/api/auth/login').reply(loginHandler);
    mock.onPost('/auth/login').reply(loginHandler);
    mockApi.onPost('/auth/login').reply(loginHandler);
    mockApi.onPost('/api/auth/login').reply(loginHandler);

    // refresh
    mock.onPost('/api/auth/refresh').reply(refreshHandler);
    mock.onPost('/auth/refresh').reply(refreshHandler);
    mockApi.onPost('/auth/refresh').reply(refreshHandler);
    mockApi.onPost('/api/auth/refresh').reply(refreshHandler);

    // logout
    mock.onPost('/api/auth/logout').reply(logoutHandler);
    mock.onPost('/auth/logout').reply(logoutHandler);
    mockApi.onPost('/auth/logout').reply(logoutHandler);
    mockApi.onPost('/api/auth/logout').reply(logoutHandler);

    // passwords
    mock.onGet('/passwords').reply(getPasswordsHandler);
    mock.onGet('/api/passwords').reply(getPasswordsHandler);
    mockApi.onGet('/passwords').reply(getPasswordsHandler);
    mockApi.onGet('/api/passwords').reply(getPasswordsHandler);

    mock.onPost('/passwords').reply(postPasswordsHandler);
    mock.onPost('/api/passwords').reply(postPasswordsHandler);
    mockApi.onPost('/passwords').reply(postPasswordsHandler);
    mockApi.onPost('/api/passwords').reply(postPasswordsHandler);

    mock.onPut(new RegExp('^/passwords/.*')).reply(putPasswordsHandler);
    mock.onPut(new RegExp('^/api/passwords/.*')).reply(putPasswordsHandler);
    mockApi.onPut(new RegExp('^/passwords/.*')).reply(putPasswordsHandler);
    mockApi.onPut(new RegExp('^/api/passwords/.*')).reply(putPasswordsHandler);

    mock.onDelete(new RegExp('^/passwords/.*')).reply(deletePasswordsHandler);
    mock.onDelete(new RegExp('^/api/passwords/.*')).reply(
        deletePasswordsHandler
    );
    mockApi
        .onDelete(new RegExp('^/passwords/.*'))
        .reply(deletePasswordsHandler);
    mockApi
        .onDelete(new RegExp('^/api/passwords/.*'))
        .reply(deletePasswordsHandler);

    // fallback
    mock.onAny().reply((config) => [
        404,
        { message: `Mock: no handler for ${config.url}` },
    ]);
    mockApi
        .onAny()
        .reply((config) => [
            404,
            { message: `Mock(api): no handler for ${config.url}` },
        ]);

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

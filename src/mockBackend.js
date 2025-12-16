import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { api } from './lib/api';

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

// Token stores (access & refresh)
function loadAccessTokens() {
    return JSON.parse(localStorage.getItem('mockAccessTokens') || '{}'); // { token: email }
}
function saveAccessTokens(map) {
    localStorage.setItem('mockAccessTokens', JSON.stringify(map));
}
function loadRefreshTokens() {
    return JSON.parse(localStorage.getItem('mockRefreshTokens') || '{}'); // { token: email }
}
function saveRefreshTokens(map) {
    localStorage.setItem('mockRefreshTokens', JSON.stringify(map));
}

// Session helper (compatibilité / fallback)
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

// Récupère l'email à partir du header Authorization: Bearer <accessToken>
function getEmailFromAuthConfig(config) {
    try {
        const headers = config.headers || {};
        const auth =
            headers.Authorization ||
            headers.authorization ||
            headers['Authorization'] ||
            null;
        if (!auth) return null;
        const parts = String(auth).split(' ');
        if (parts.length !== 2) return null;
        const token = parts[1];
        const accessTokens = loadAccessTokens();
        return accessTokens[token] || null;
    } catch {
        return null;
    }
}

// Supprime tous les access tokens associés à un email
function removeAccessTokensForEmail(email) {
    const accessTokens = loadAccessTokens();
    let changed = false;
    for (const t of Object.keys(accessTokens)) {
        if (accessTokens[t] === email) {
            delete accessTokens[t];
            changed = true;
        }
    }
    if (changed) saveAccessTokens(accessTokens);
}

// Attacher le mock
export default function setupMock() {
    // two adapters: one for default axios, one for the api instance
    const mock = new AxiosMockAdapter(axios, { delayResponse: 400 });
    const mockApi = new AxiosMockAdapter(api, { delayResponse: 400 });

    // Charger l’état depuis localStorage
    let users = loadUsers(); // { email: { salt, passwordHash } }

    // small helpers
    const ok = (body = {}, headers = {}) => [200, body, headers];
    const created = (body = {}, headers = {}) => [201, body, headers];
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
            const { email, passwordHash, salt } = JSON.parse(config.data);
            if (!email || !passwordHash || !salt) {
                return badRequest("Données d'inscription incomplètes.");
            }

            if (email === 'error@test.com') {
                return serverError('Mock: erreur serveur.');
            }

            users = loadUsers(); // reload
            if (users[email]) {
                return badRequest('Mock: email déjà utilisé.');
            }

            users[email] = { salt, passwordHash };
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
            return ok({ salt: users[email].salt });
        } catch {
            return serverError('Mock: payload invalide.');
        }
    };

    const loginHandler = (config) => {
        try {
            const { email, passwordHash } = JSON.parse(config.data);
            users = loadUsers();
            if (!users[email]) {
                return unauthorized('Mock: identifiants incorrects.');
            }
            if (users[email].passwordHash !== passwordHash) {
                return unauthorized('Mock: identifiants incorrects.');
            }
            if (email === 'locked@test.com') {
                return forbidden('Mock: compte verrouillé.');
            }

            // créer tokens côté mock
            const accessTokens = loadAccessTokens();
            const refreshTokens = loadRefreshTokens();

            const accessToken = `mock-access-${makeId()}`;
            const refreshToken = `mock-refresh-${makeId()}`;

            accessTokens[accessToken] = email;
            refreshTokens[refreshToken] = email;

            saveAccessTokens(accessTokens);
            saveRefreshTokens(refreshTokens);

            // compatibilité: conserver mockSession (certains anciens handlers pouvaient s'appuyer dessus)
            setMockSession(email);

            // headers identiques au backend
            const headers = {
                Authorization: `Bearer ${accessToken}`,
                'x-refresh-token': refreshToken,
            };

            // body identique au backend
            return ok(
                {
                    message: 'Mock: connexion réussie.',
                    accessToken,
                    refreshToken,
                    userEmail: email, // <-- même clé que backend
                },
                headers
            );
        } catch {
            return serverError('Mock: payload invalide.');
        }
    };

    const refreshHandler = (config) => {
        try {
            // accepter { refreshToken } dans le body
            const body = config.data ? JSON.parse(config.data) : {};
            const incomingRefresh = body?.refreshToken;
            if (!incomingRefresh) {
                return unauthorized('No refreshToken provided.');
            }

            const refreshTokens = loadRefreshTokens();
            const email = refreshTokens[incomingRefresh];

            if (!email) {
                // token inconnu / invalide
                return unauthorized('Invalid refresh token.');
            }

            // rotation: supprimer l'ancien refresh token et en créer un nouveau
            delete refreshTokens[incomingRefresh];
            const newRefresh = `mock-refresh-${makeId()}`;
            refreshTokens[newRefresh] = email;
            saveRefreshTokens(refreshTokens);

            // créer un nouvel access token
            const accessTokens = loadAccessTokens();
            const newAccess = `mock-access-${makeId()}`;
            accessTokens[newAccess] = email;
            saveAccessTokens(accessTokens);

            // mise à jour de la session (compatibilité)
            setMockSession(email);

            // headers identiques au backend
            const headers = {
                Authorization: `Bearer ${newAccess}`,
                'X-Refresh-Token': newRefresh,
                'Access-Control-Expose-Headers':
                    'Authorization, X-Refresh-Token',
            };

            // body identique au backend
            return ok({ message: 'Token refreshed' }, headers);
        } catch {
            return serverError('Mock: payload invalide.');
        }
    };

    const logoutHandler = (config) => {
        try {
            // Attendre { refreshToken } dans le body
            const body = config.data ? JSON.parse(config.data) : {};
            const incomingRefresh = body?.refreshToken;

            if (incomingRefresh) {
                const refreshTokens = loadRefreshTokens();
                const email = refreshTokens[incomingRefresh];
                if (email) {
                    // supprimer le refresh token côté serveur (mock)
                    delete refreshTokens[incomingRefresh];
                    saveRefreshTokens(refreshTokens);

                    // supprimer aussi les access tokens pour cet email
                    removeAccessTokensForEmail(email);
                }
            } else {
                // fallback : si pas de refreshToken fourni, on se contente de clearMockSession
                const email = getMockSession();
                if (email) {
                    removeAccessTokensForEmail(email);

                    // supprimer tous les refresh tokens pointant vers cet email (nettoyage)
                    const refreshTokens = loadRefreshTokens();
                    let changed = false;
                    for (const t of Object.keys(refreshTokens)) {
                        if (refreshTokens[t] === email) {
                            delete refreshTokens[t];
                            changed = true;
                        }
                    }
                    if (changed) saveRefreshTokens(refreshTokens);
                }
            }

            clearMockSession();
            return ok({ message: 'Mock: déconnecté.' });
        } catch {
            return serverError('Mock: payload invalide.');
        }
    };

    const getPasswordsHandler = (config) => {
        const email = getEmailFromAuthConfig(config) || getMockSession();
        if (!email) return unauthorized('Not authenticated (mock).');
        const list = loadPasswordsFor(email);
        return ok(list);
    };

    const postPasswordsHandler = (config) => {
        const email = getEmailFromAuthConfig(config) || getMockSession();
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
        const email = getEmailFromAuthConfig(config) || getMockSession();
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
        const email = getEmailFromAuthConfig(config) || getMockSession();
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
    mock.onPost('/api/auth/refresh-token').reply(refreshHandler);
    mock.onPost('/auth/refresh-token').reply(refreshHandler);
    mockApi.onPost('/auth/refresh-token').reply(refreshHandler);
    mockApi.onPost('/api/auth/refresh-token').reply(refreshHandler);

    // logout
    mock.onPost('/api/auth/logout').reply(logoutHandler);
    mock.onPost('/auth/logout').reply(logoutHandler);
    mockApi.onPost('/api/auth/logout').reply(logoutHandler);
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

    return mock;
}

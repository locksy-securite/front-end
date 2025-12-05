import axios from 'axios';

/**
 * Instance Axios utilisée par l'application.
 * baseURL est pris depuis VITE_API_URL (fallback sur '/api' si non défini).
 * withCredentials true pour permettre les endpoints de refresh/logout qui utilisent des cookies HttpOnly.
 */
const baseURL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;

import axios from 'axios';

/**
 * Instance Axios utilisée par l'application.
 * L'en-tête Authorization n'est pas défini ici (il sera ajouté par un interceptor avec l'accessToken en mémoire).
 * withCredentials doit être à true pour les endpoints de refresh/logout qui utilisent des cookies HttpOnly.
 */
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

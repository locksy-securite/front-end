import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

export default function setupMock() {
    const mock = new AxiosMockAdapter(axios, { delayResponse: 500 });

    // Liste des emails déjà utilisés (mock)
    const registeredEmails = new Set();

    mock.onPost('/api/auth/register').reply((config) => {
        const { email } = JSON.parse(config.data);

        // Simuler une erreur serveur aléatoire
        if (email === 'error@test.com') {
            return [500, { message: 'Mock: erreur serveur.' }];
        }

        // Vérifier si l'email est déjà enregistré
        if (registeredEmails.has(email)) {
            return [400, { message: 'Mock: email déjà utilisé.' }];
        }

        // Sinon, enregistrer l'email et renvoyer succès
        registeredEmails.add(email);
        return [200, { message: 'Mock: compte créé avec succès.' }];
    });

    return mock;
}

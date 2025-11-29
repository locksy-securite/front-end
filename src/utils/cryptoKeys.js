export const fromUtf8 = (str) => new TextEncoder().encode(str);

/**
 * HKDF utilitaire basé sur Web Crypto API (SHA-256)
 * @param {Uint8Array} masterKey - clé maître issue d'Argon2id
 * @param {string} info - contexte de dérivation (ex: "locksy_registration_v1")
 * @param {number} length - taille de la sous-clé en octets (par défaut 32)
 * @returns {Promise<Uint8Array>} sous-clé dérivée
 */
export async function deriveSubKey(masterKey, info, length = 32) {
    const salt = new Uint8Array(0); // pas de sel supplémentaire ici
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        masterKey,
        { name: 'HKDF' },
        false,
        ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt,
            info: fromUtf8(info),
        },
        keyMaterial,
        length * 8
    );
    return new Uint8Array(derivedBits);
}

/**
 * Mapping des sous-clés
 * Chaque fonctionnalité a son propre identifiant HKDF
 */
export const SUBKEYS = {
    registration: 'locksy_registration_v1',
    auth: 'locksy_auth_v1',
    passwords: 'locksy_passwords_v1',
    notes: 'locksy_notes_v1',
    cards: 'locksy_cards_v1',
    accountEmail: 'locksy_account_email_v1',
    accountPassword: 'locksy_account_password_v1',
};

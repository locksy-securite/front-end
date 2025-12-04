// Utilitaire simple pour l'API "Pwned Passwords" (k-anonymity).
// - Renvoie le nombre d'occurrences trouvées pour un mot de passe (0 = non trouvé).
// - Calcul SHA-1 côté client via SubtleCrypto.
// - Envoie seulement les 5 premiers hex (préfixe du hash), ce qui préserve la confidentialité.

/**
 * Convertit un ArrayBuffer en chaîne hexadécimale MAJUSCULE.
 * @param {ArrayBuffer} buf
 * @returns {string} hex en MAJUSCULE (longueur 40 pour SHA-1)
 */
function bufferToHexUpper(buf) {
    const bytes = new Uint8Array(buf);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}

/**
 * Appelle l'API HIBP (k-anonymity) pour un préfixe SHA-1.
 * @param {string} prefix - 5 premiers caractères hex du hash du mot de passe
 * @returns {Promise<string>} liste brute des suffixes retournée par l’API
 */
async function fetchRange(prefix) {
    const url = `https://api.pwnedpasswords.com/range/${prefix}`;

    const res = await fetch(url, { method: 'GET', cache: 'no-store' });

    if (!res.ok) {
        // 404 = aucun résultat connu → on retourne une chaîne vide
        if (res.status === 404) return '';
        throw new Error(`HIBP request failed: ${res.status}`);
    }

    return res.text();
}

/**
 * Vérifie si un mot de passe apparaît dans des fuites connues (HaveIBeenPwned).
 * Renvoie le nombre d'occurrences trouvées (0 si aucune).
 *
 * @param {string} password
 * @returns {Promise<number>}
 *
 * NOTE : En cas d'erreur réseau/API, la fonction lance une exception.
 * L'appelant doit alors gérer ce cas (par exemple en autorisant l'inscription
 * mais en affichant un message d'information).
 */
export async function checkPwnedCount(password) {
    if (!password || typeof password !== 'string') return 0;

    // 1) Calcul SHA-1 local
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest(
        'SHA-1',
        encoder.encode(password)
    );
    const sha1 = bufferToHexUpper(hashBuf);

    const prefix = sha1.slice(0, 5); // envoyé à HIBP
    const suffix = sha1.slice(5); // comparaison locale

    // 2) Appel API
    const responseText = await fetchRange(prefix);
    if (!responseText) return 0;

    // 3) Recherche du suffixe correspondant
    const lines = responseText.split(/\r?\n/);
    for (const line of lines) {
        if (!line) continue;
        const [respSuffix, countStr] = line.split(':');
        if (respSuffix?.toUpperCase() === suffix) {
            return parseInt(countStr.trim(), 10) || 0;
        }
    }

    return 0;
}

export default { checkPwnedCount };

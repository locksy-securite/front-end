import { useState } from 'react';
import axios from 'axios';
import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';
import argon2 from 'argon2-wasm-pro';

import { useCrypto } from '../hooks/useCrypto.js'; // Hook global CryptoProvider
import { SUBKEYS, fromUtf8, deriveSubKey } from '../utils/cryptoKeys.js'; // Utilitaires centralisés

// Helpers sécurisés pour encodage
const toBase64 = (bytes) => {
    let binary = '';
    const bytesArray = new Uint8Array(bytes);
    const len = bytesArray.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytesArray[i]);
    }
    return window.btoa(binary);
};

const ENVELOPE_META = {
    version: 1,
    kdf: { alg: 'argon2id', params: { m: 65536, t: 3, p: 1, hashLen: 32 } },
    encryption: { alg: 'aes-256-gcm', tagBits: 128 },
};

export default function LoginForm({ onToast }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { setMasterKeyBytes } = useCrypto();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        let salt = null;
        let masterKeyBytes = null;
        let loginKeyBytes = null;
        let nonce = null;
        let aad = null;
        let loginPayload = null;

        try {
            // 1. Récupérer le sel côté serveur (lié à l’utilisateur)
            const { data: serverData } = await axios.post('/api/auth/salt', {
                email,
            });
            salt = Uint8Array.from(atob(serverData.salt_b64), (c) =>
                c.charCodeAt(0)
            );

            // 2. Dériver la clé maître avec Argon2id
            const { hash } = await argon2.hash({
                pass: password,
                salt,
                type: 'argon2id',
                memoryCost: ENVELOPE_META.kdf.params.m,
                timeCost: ENVELOPE_META.kdf.params.t,
                parallelism: ENVELOPE_META.kdf.params.p,
                hashLen: ENVELOPE_META.kdf.params.hashLen,
            });

            // Clé maître issue d'Argon2id
            masterKeyBytes = new Uint8Array(hash);
            setMasterKeyBytes(masterKeyBytes); // stockée globalement dans CryptoProvider

            // 3. HKDF : dériver une sous-clé spécifique pour la connexion directement avec masterKeyBytes
            loginKeyBytes = await deriveSubKey(
                masterKeyBytes,
                SUBKEYS.login,
                32
            );

            // Clé AES-GCM (256 bits) importée depuis la sous-clé HKDF
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                loginKeyBytes,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt']
            );

            // 4. IV/nonce aléatoire (12 octets) pour GCM
            nonce = new Uint8Array(12);
            crypto.getRandomValues(nonce);

            // 5. AAD (contexte)
            const aadString = JSON.stringify({
                v: ENVELOPE_META.version,
                email,
                kdf: ENVELOPE_META.kdf,
                login_at: Date.now(),
            });
            aad = fromUtf8(aadString);

            // 6. Payload minimal de connexion
            loginPayload = fromUtf8('login_proof_v1');

            // Chiffrement authentifié (AES-GCM)
            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: nonce,
                    additionalData: aad,
                    tagLength: ENVELOPE_META.encryption.tagBits,
                },
                cryptoKey,
                loginPayload
            );

            // Enveloppe transportable
            const envelope = {
                ...ENVELOPE_META,
                salt_b64: serverData.salt_b64,
                aad_json: aadString,
                data_b64: toBase64(
                    new Uint8Array([...nonce, ...new Uint8Array(ciphertext)])
                        .buffer
                ),
            };

            // 7. Envoyer au serveur pour vérification
            await axios.post('/api/auth/login', {
                email,
                password_hash_b64: toBase64(masterKeyBytes),
                envelope,
            });

            // 8. Nettoyage
            masterKeyBytes.fill(0);
            loginKeyBytes.fill(0);
            salt.fill(0);
            nonce.fill(0);
            if (aad) new Uint8Array(aad.buffer).fill(0);
            if (loginPayload) new Uint8Array(loginPayload.buffer).fill(0);

            setEmail('');
            setPassword('');
            onToast?.('success', 'Connexion réussie. Bienvenue dans Locksy.');
        } catch (err) {
            console.error('Login error:', err?.message || err);
            const errorMsg =
                err?.response?.data?.message ||
                'Échec de la connexion. Vérifiez vos identifiants.';
            onToast?.('error', errorMsg);
        } finally {
            masterKeyBytes = null;
            loginKeyBytes = null;
            salt = null;
            nonce = null;
            aad = null;
            loginPayload = null;
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleLogin}
            className="card w-full max-w-md bg-base-100 shadow-sm p-6 space-y-4"
        >
            <h2 className="text-2xl font-bold text-center">Connexion</h2>
            <EmailInput value={email} onChange={setEmail} />
            <PasswordInput value={password} onChange={setPassword} validate={false} />
            <div className="text-sm text-base-content/70">
                <p>
                    Votre clé est dérivée de votre mot de passe sur votre
                    appareil. Elle ne quitte jamais votre navigateur.
                </p>
            </div>
            <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
            >
                {loading ? (
                    <span className="loading loading-ring loading-sm text-primary"></span>
                ) : (
                    'Se connecter'
                )}
            </button>
            <div className="divider" />
            <div className="text-xs text-base-content/60">
                <p>
                    Conseil : utilisez une phrase de passe longue. En cas
                    d'oubli, vos données chiffrées sont irrécupérables (modèle
                    zero-knowledge).
                </p>
            </div>
        </form>
    );
}

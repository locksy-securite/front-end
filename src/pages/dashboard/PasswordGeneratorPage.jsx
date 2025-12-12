import React, { useMemo, useState } from 'react';
import Toggle from '../../components/Toggle';
import RangeSlider from '../../components/RangeSlider';
import { useToast } from '../../hooks/useToast';

// Jeu de symboles
const SYMBOLS = '@!$%&*';

// Générateur d'entier sécurisé dans [0, max) via crypto.getRandomValues
function randomIntSecure(max) {
    if (!Number.isFinite(max) || max <= 0) return 0;

    const MAX_UINT32 = 0xffffffff;
    const rangeLimit = Math.floor((MAX_UINT32 + 1) / max) * max;
    const buffer = new Uint32Array(1);

    while (true) {
        crypto.getRandomValues(buffer);
        const value = buffer[0];
        if (value < rangeLimit) return value % max;
    }
}

// Mélange un tableau avec l'algorithme de Fisher–Yates
function shuffleSecure(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const randomIndex = randomIntSecure(i + 1);
        [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
    }
    return array;
}

// Prend un caractère aléatoire dans une chaîne
function randomChar(str) {
    if (!str || str.length === 0) return '';
    const index = randomIntSecure(str.length);
    return str.charAt(index);
}

// Fonction pure qui construit un mot de passe selon les options
function buildPassword({ length, useUppercase, useDigits, useSymbols }) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const symbols = SYMBOLS;

    // Pools de caractères disponibles
    const pools = [lowercase]; // les minuscules sont toujours présentes
    const requiredChars = [randomChar(lowercase)]; // garantir au moins une minuscule

    if (useUppercase) {
        pools.push(uppercase); // Si l'option est activée, on ajoute le groupe dans pools
        requiredChars.push(randomChar(uppercase)); // ajoute aussi un caractère obligatoire de ce groupe dans requiredChars
    }
    if (useDigits) {
        pools.push(digits);
        requiredChars.push(randomChar(digits));
    }
    if (useSymbols) {
        pools.push(symbols);
        requiredChars.push(randomChar(symbols));
    }

    const minRequired = requiredChars.length;
    const finalLength = Math.max(length, minRequired);

    // Fusionne tous les ensembles choisis en une seule chaîne pool
    const pool = pools.join('');
    if (!pool) return '';

    // Initialise le mot de passe avec les caractères obligatoires
    const chars = [...requiredChars];

    // Ajoute des caractères aléatoires depuis le pool global jusqu'à atteindre la longueur finale
    for (let i = chars.length; i < finalLength; i++) {
        chars.push(randomChar(pool));
    }

    // Mélange le tableau pour que les caractères obligatoires ne soient pas toujours au début
    shuffleSecure(chars);

    // Transforme le tableau en chaîne finale
    return chars.slice(0, finalLength).join('');
}

export default function PasswordGeneratorPage() {
    const { addToast } = useToast() || {};

    // État contrôlé des options utilisateur
    const [passwordLength, setPasswordLength] = useState(20);
    const [useUppercase, setUseUppercase] = useState(true);
    const [useDigits, setUseDigits] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);

    // Nonce pour forcer la régénération même si les options n'ont pas changé
    const [regenNonce, setRegenNonce] = useState(0);

    /* Mot de passe recalculé quand les options ou le nonce changent.
       useMemo évite d'exécuter la génération à chaque rendu inutilement. */
    const password = useMemo(() => {
        void regenNonce;
        return buildPassword({
            length: passwordLength,
            useUppercase,
            useDigits,
            useSymbols,
        });
    }, [passwordLength, useUppercase, useDigits, useSymbols, regenNonce]);

    // Force une régénération en incrémentant le nonce
    const regeneratePassword = () => {
        setRegenNonce((n) => n + 1);
    };

    // Copier dans le presse-papiers
    const handleCopy = async () => {
        if (!password) {
            addToast?.('warning', 'Aucun mot de passe à copier.');
            return;
        }
        try {
            await navigator.clipboard.writeText(password);
            addToast?.('success', 'Mot de passe copié dans le presse-papiers.');
        } catch (err) {
            console.error('Clipboard error', err);
            addToast?.('error', 'Impossible de copier le mot de passe.');
        }
    };

    return (
        <div className="p-4 lg:p-6">
            <h1 className="text-2xl font-bold mb-6">
                Générateur de mot de passe
            </h1>

            <div className="flex flex-col lg:flex-row gap-6 items-center">
                {/* Colonne options */}
                <div
                    className="order-first lg:order-last w-full lg:w-1/2 shrink-0"
                    aria-live="polite"
                >
                    <div className="bg-base-100 rounded-box shadow-sm p-6 space-y-4">
                        <Toggle
                            id="pg-upper"
                            label="Lettres majuscules (A-Z)"
                            checked={useUppercase}
                            onChange={setUseUppercase}
                        />

                        <Toggle
                            id="pg-digits"
                            label="Chiffres (0-9)"
                            checked={useDigits}
                            onChange={setUseDigits}
                        />

                        <Toggle
                            id="pg-symbols"
                            label={`Symboles (${SYMBOLS})`}
                            checked={useSymbols}
                            onChange={setUseSymbols}
                        />

                        <RangeSlider
                            id="pg-length"
                            label="Longueur"
                            min={8}
                            max={50}
                            step={1}
                            value={passwordLength}
                            onChange={setPasswordLength}
                        />

                        <div className="text-sm text-base-content/70">
                            Recommandation : privilégiez 16+ caractères.
                        </div>
                    </div>
                </div>

                {/* Colonne résultat */}
                <div className="w-full lg:w-1/2">
                    <div className="sticky top-4">
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <input
                                    className="input w-full font-mono text-lg"
                                    readOnly
                                    value={password}
                                    aria-label="Mot de passe généré"
                                />

                                <button
                                    type="button"
                                    className="btn btn-square btn-primary"
                                    onClick={regeneratePassword}
                                    title="Regénérer"
                                    aria-label="Regénérer"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-4 h-4"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path d="M12,2a10.032,10.032,0,0,1,7.122,3H16a1,1,0,0,0-1,1h0a1,1,0,0,0,1,1h4.143A1.858,1.858,0,0,0,22,5.143V1a1,1,0,0,0-1-1h0a1,1,0,0,0-1,1V3.078A11.981,11.981,0,0,0,.05,10.9a1.007,1.007,0,0,0,1,1.1h0a.982.982,0,0,0,.989-.878A10.014,10.014,0,0,1,12,2Z" />
                                        <path d="M22.951,12a.982.982,0,0,0-.989.878A9.986,9.986,0,0,1,4.878,19H8a1,1,0,0,0,1-1H9a1,1,0,0,0-1-1H3.857A1.856,1.856,0,0,0,2,18.857V23a1,1,0,0,0,1,1H3a1,1,0,0,0,1-1V20.922A11.981,11.981,0,0,0,23.95,13.1a1.007,1.007,0,0,0-1-1.1Z" />
                                    </svg>
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-square btn-primary"
                                    onClick={handleCopy}
                                    title="Copier"
                                    aria-label="Copier"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-4 h-4"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path d="m13 20a5.006 5.006 0 0 0 5-5v-8.757a3.972 3.972 0 0 0 -1.172-2.829l-2.242-2.242a3.972 3.972 0 0 0 -2.829-1.172h-4.757a5.006 5.006 0 0 0 -5 5v10a5.006 5.006 0 0 0 5 5zm-9-5v-10a3 3 0 0 1 3-3s4.919.014 5 .024v1.976a2 2 0 0 0 2 2h1.976c.01.081.024 9 .024 9a3 3 0 0 1 -3 3h-6a3 3 0 0 1 -3-3zm18-7v11a5.006 5.006 0 0 1 -5 5h-9a1 1 0 0 1 0-2h9a3 3 0 0 0 3-3v-11a1 1 0 0 1 2 0z" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-sm text-center text-base-content/70">
                                Génération côté client sécurisée.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

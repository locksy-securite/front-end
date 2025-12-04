import { useState, useRef, useEffect, useCallback } from 'react';
import PasswordRow from './PasswordRow';
import TextInput from '../TextInput';
import PasswordInput from '../PasswordInput';
import { useToast } from '../../hooks/useToast';

// passwords: Array<{ id_password, name, username, secret }>
export default function PasswordsList({
    passwords = [],
    onSave,
    onDelete,
    onToast,
}) {
    const toastCtx = useToast();
    const addToast = toastCtx?.addToast;

    // États UI
    const [selected, setSelected] = useState(null); // id_password sélectionné
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Formulaire contrôlé
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        secret: '',
    });

    const nameRef = useRef(null);

    // toast fonction : utilise onToast si fourni, sinon addToast du context, sinon fallback console
    const toast = useCallback(
        (type, message) => {
            try {
                if (typeof onToast === 'function') {
                    onToast(type, message);
                    return;
                }
                if (typeof addToast === 'function') {
                    addToast(type, message);
                    return;
                }
                // fallback développement
                if (import.meta.env.DEV) {
                    console.log(`[${type}] ${message}`);
                }
            } catch (e) {
                console.warn('Toast failed', e);
            }
        },
        [onToast, addToast]
    );

    // Synchroniser la sélection si la liste change (ex: suppression externe)
    useEffect(() => {
        if (selected == null) return;
        const exists = passwords.some((p) => p.id_password === selected);
        if (!exists) {
            // sélection supprimée -> réinitialiser le formulaire
            resetForm();
            setSelected(null);
        }
    }, [passwords, selected, toast]);

    // Réinitialiser le formulaire (et optionnellement garder la sélection)
    const resetForm = (keepSelection = false) => {
        setFormData({ name: '', username: '', secret: '' });
        setShowPassword(false);
        if (!keepSelection) setSelected(null);
    };

    // Sélectionner une ligne -> remplir le formulaire
    const handleSelect = (pwd) => {
        if (!pwd) {
            resetForm();
            return;
        }
        setSelected(pwd.id_password);
        setFormData({
            name: pwd.name || '',
            username: pwd.username || '',
            secret: pwd.secret || '',
        });
        setTimeout(() => nameRef.current?.focus?.(), 0);
    };

    // Mode ajout
    const handleAddClick = () => {
        resetForm();
        setSelected(null);
        setTimeout(() => nameRef.current?.focus?.(), 0);
    };

    // Changement de champ
    const handleChange = (field, value) => {
        setFormData((s) => ({ ...s, [field]: value }));
    };

    // Copier dans le presse-papiers
    const handleCopy = async (text, label = 'Valeur copiée') => {
        if (!text) {
            toast('warning', `Aucune valeur à copier pour ${label}.`);
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            toast('success', `${label} copiée dans le presse-papiers.`);
        } catch (error) {
            // log pour debug
            console.error('Clipboard error', error);
            toast('error', `Impossible de copier ${label}.`);
        }
    };

    // Sauvegarde (création ou mise à jour)
    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        if (!formData.name.trim()) {
            toast('warning', 'Le champ "Nom" est requis.');
            return;
        }
        if (!formData.secret.trim()) {
            toast('warning', 'Le champ "Mot de passe" est requis.');
            return;
        }

        const payload = {
            ...(selected ? { id_password: selected } : {}),
            name: formData.name.trim(),
            username: formData.username.trim(),
            secret: formData.secret,
        };

        try {
            setIsSaving(true);
            await Promise.resolve(onSave(payload));

            if (selected) {
                // mise à jour : garder la sélection et les champs
                toast('success', 'Mot de passe mis à jour.');
            } else {
                // création : réinitialiser le formulaire
                resetForm();
                toast('success', 'Nouveau mot de passe ajouté.');
            }
        } catch (error) {
            const message =
                (error?.message && String(error.message)) ||
                (error?.response?.data?.message &&
                    error.response.data.message) ||
                'Erreur lors de la sauvegarde.';
            toast('error', message);
        } finally {
            setIsSaving(false);
        }
    };

    // Suppression du mot de passe sélectionné
    const handleDelete = async () => {
        if (!selected) return;
        const confirmed = window.confirm(
            'Confirmer la suppression de ce mot de passe ? Cette action est irréversible.'
        );
        if (!confirmed) return;

        try {
            setIsDeleting(true);
            await Promise.resolve(onDelete(selected));
            resetForm();
            setSelected(null);
            toast('success', 'Mot de passe supprimé.');
        } catch (error) {
            const message =
                (error?.message && String(error.message)) ||
                (error?.response?.data?.message &&
                    error.response.data.message) ||
                'Erreur lors de la suppression.';
            toast('error', message);
        } finally {
            setIsDeleting(false);
        }
    };

    // États pour désactiver les boutons
    const saveDisabled =
        isSaving ||
        isDeleting ||
        !formData.name.trim() ||
        !formData.secret.trim();
    const deleteDisabled = !selected || isDeleting || isSaving;

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Panneau droite : formulaire + bouton ajouter */}
            <div
                className="order-first lg:order-last w-full lg:w-1/2 shrink-0"
                aria-live="polite"
            >
                <div className="sticky top-4">
                    <div className="flex justify-end mb-4">
                        <button
                            type="button"
                            className="btn btn-primary gap-2"
                            onClick={handleAddClick}
                            disabled={isSaving || isDeleting}
                            aria-label="Ajouter un mot de passe"
                            title="Ajouter un mot de passe"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="w-4 h-4"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="m12 0a12 12 0 1 0 12 12 12.013 12.013 0 0 0 -12-12zm0 22a10 10 0 1 1 10-10 10.011 10.011 0 0 1 -10 10zm5-10a1 1 0 0 1 -1 1h-3v3a1 1 0 0 1 -2 0v-3h-3a1 1 0 0 1 0-2h3v-3a1 1 0 0 1 2 0v3h3a1 1 0 0 1 1 1z" />
                            </svg>
                            <span>Ajouter un mot de passe</span>
                        </button>
                    </div>

                    <form
                        className="bg-base-100 rounded-box shadow-sm p-6 space-y-4"
                        onSubmit={handleSubmit}
                        aria-busy={isSaving}
                        aria-label={
                            selected
                                ? 'Formulaire de modification'
                                : "Formulaire d'ajout"
                        }
                    >
                        <TextInput
                            id="name"
                            label="Nom"
                            value={formData.name}
                            onChange={(val) => handleChange('name', val)}
                            placeholder="Nom du service"
                            disabled={isSaving}
                            ref={nameRef}
                        />

                        <div className="flex items-end gap-2">
                            <TextInput
                                id="username"
                                label="Identifiant"
                                value={formData.username}
                                onChange={(val) =>
                                    handleChange('username', val)
                                }
                                placeholder="exemple@domaine.com"
                                disabled={isSaving}
                            />
                            <button
                                type="button"
                                className="btn btn-square btn-secondary"
                                onClick={() =>
                                    handleCopy(formData.username, 'Identifiant')
                                }
                                disabled={!formData.username || isSaving}
                                aria-label="Copier l'identifiant"
                                title={
                                    !formData.username
                                        ? 'Aucun identifiant'
                                        : "Copier l'identifiant"
                                }
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

                        <div className="flex items-end gap-2">
                            <PasswordInput
                                value={formData.secret}
                                onChange={(val) => handleChange('secret', val)}
                                validate={false}
                                inputType={showPassword ? 'text' : 'password'}
                                disabled={isSaving}
                            />
                            <button
                                type="button"
                                className="btn btn-square btn-secondary"
                                onClick={() => setShowPassword((prev) => !prev)}
                                disabled={!formData.secret || isSaving}
                                aria-label={showPassword ? 'Masquer' : 'Voir'}
                                title={showPassword ? 'Masquer' : 'Voir'}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path d="M23.271,9.419C21.72,6.893,18.192,2.655,12,2.655S2.28,6.893.729,9.419a4.908,4.908,0,0 0,0,5.162C2.28,17.107,5.808,21.345,12,21.345s9.72-4.238,11.271-6.764A4.908 4.908 0 0 0 23.271 9.419Zm-1.705 4.115C20.234 15.7 17.219 19.345 12 19.345S3.766 15.7 2.434 13.534a2.918 2.918 0 0 1 0-3.068C3.766 8.3 6.781 4.655 12 4.655s8.234 3.641 9.566 5.811A2.918 2.918 0 0 1 21.566 13.534Z" />
                                    <path d="M12,7a5,5,0,1 0,5,5A5.006 5.006 0 0 0 12 7Zm0 8a3 3 0 1 1 3-3A3 3 0 0 1 12 15Z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="btn btn-square btn-secondary"
                                onClick={() =>
                                    handleCopy(formData.secret, 'Mot de passe')
                                }
                                disabled={!formData.secret || isSaving}
                                aria-label="Copier le mot de passe"
                                title={
                                    !formData.secret
                                        ? 'Aucun mot de passe'
                                        : 'Copier le mot de passe'
                                }
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

                        <div className="flex flex-col gap-4 pt-4 lg:flex-row">
                            <button
                                type="submit"
                                className="btn btn-primary lg:flex-1"
                                disabled={saveDisabled}
                                aria-label={
                                    selected ? 'Sauvegarder' : 'Ajouter'
                                }
                            >
                                {isSaving ? (
                                    <span
                                        className="loading loading-ring loading-sm text-primary"
                                        aria-hidden="true"
                                    />
                                ) : selected ? (
                                    'Sauvegarder'
                                ) : (
                                    'Ajouter'
                                )}
                            </button>

                            <button
                                type="button"
                                className="btn btn-error lg:flex-1"
                                onClick={handleDelete}
                                disabled={deleteDisabled}
                                aria-label="Supprimer"
                            >
                                {isDeleting ? (
                                    <span
                                        className="loading loading-ring loading-sm text-primary"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    'Supprimer'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Panneau gauche : liste */}
            <div className="w-full lg:w-1/2">
                <ul
                    className="list space-y-1"
                    role="list"
                    aria-label="Liste des mots de passe"
                >
                    {passwords.length === 0 ? (
                        <li className="p-4 text-sm text-base-content/70 bg-base-100 rounded-box shadow-sm">
                            Aucun mot de passe enregistré.
                        </li>
                    ) : (
                        passwords.map((pwd) => (
                            <PasswordRow
                                key={pwd.id_password}
                                password={pwd}
                                isActive={selected === pwd.id_password}
                                onSelect={() => handleSelect(pwd)}
                            />
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}

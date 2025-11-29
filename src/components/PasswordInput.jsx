export default function PasswordInput({ value, onChange }) {
    return (
        <div className="form-control w-full">
            <label htmlFor="password" className="label">
                <span className="label-text">Mot de passe</span>
            </label>
            <input
                id="password"
                type="password"
                className="input validator w-full"
                required
                placeholder="********"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                minLength={8}
                pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
                title="Min 8 caractères, incluant au moins un chiffre, une lettre minuscule, une majuscule et un caractère spécial"
                aria-describedby="password-hint"
            />
            <p id="password-hint" className="validator-hint hidden">
                Le mot de passe doit contenir :
                <br />• 8 caractères minimum
                <br />• Au moins un chiffre
                <br />• Une lettre minuscule
                <br />• Une lettre majuscule
                <br />• Un caractère spécial
            </p>
        </div>
    );
}

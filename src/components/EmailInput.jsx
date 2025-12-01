export default function EmailInput({ value, onChange }) {
    return (
        <div className="form-control w-full">
            <label htmlFor="email" className="label">
                <span className="label-text">Email</span>
            </label>
            <input
                id="email"
                type="email"
                className="input validator w-full"
                required
                placeholder="exemple@domaine.com"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                title="Veuillez entrer une adresse email valide"
                aria-describedby="email-hint"
            />
            <p id="email-hint" className="validator-hint hidden">
                Adresse email invalide
            </p>
        </div>
    );
}
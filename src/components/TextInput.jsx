export default function TextInput({
    id,
    label,
    value,
    onChange,
    placeholder = '',
    required = true,
}) {
    const handleChange = (e) => {
        onChange(e.target.value);
    };

    return (
        <div className="form-control w-full">
            <label htmlFor={id} className="label">
                <span className="label-text">{label}</span>
            </label>
            <input
                id={id}
                type="text"
                className="input validator w-full"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                {...(required && {
                    required: true,
                    title: 'Ce champ est obligatoire',
                    'aria-describedby': `${id}-hint`,
                })}
            />
            {required && (
                <p id={`${id}-hint`} className="validator-hint hidden">
                    Ce champ ne peut pas être vide
                </p>
            )}
        </div>
    );
}

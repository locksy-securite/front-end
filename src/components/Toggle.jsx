export default function Toggle({
    id,
    label,
    checked,
    defaultChecked = false,
    onChange,
    disabled = false,
}) {
    const handleChange = (e) => {
        onChange?.(e.target.checked);
    };

    return (
        <div className="form-control w-full">
            <div className="flex gap-6 items-center">
                <div className="flex-1">
                    <label htmlFor={id} className="label">
                        <span className="label-text">{label}</span>
                    </label>
                </div>

                <div className="flex-1 flex justify-end">
                    <input
                        id={id}
                        type="checkbox"
                        className="toggle"
                        aria-checked={checked}
                        {...(typeof checked === 'boolean'
                            ? { checked }
                            : { defaultChecked })}
                        onChange={handleChange}
                        disabled={disabled}
                        aria-label={label}
                    />
                </div>
            </div>
        </div>
    );
}

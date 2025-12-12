export default function RangeSlider({
    id,
    label,
    min = 8,
    max = 50,
    value = 20,
    step = 1,
    onChange,
    disabled = false,
}) {
    const handleChange = (e) => {
        const v = Number(e.target.value);
        onChange?.(v);
    };

    return (
        <div className="form-control w-full">
            <div className="flex gap-6 items-center">
                <div className="flex-1">
                    <label htmlFor={id} className="label">
                        <span className="label-text">
                            {label} • <span aria-live="polite">{value}</span>
                        </span>
                    </label>
                </div>

                <div className="flex-1 flex items-center justify-end">
                    <input
                        id={id}
                        type="range"
                        className="range w-full max-w-xs"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={handleChange}
                        disabled={disabled}
                        aria-valuemin={min}
                        aria-valuemax={max}
                        aria-valuenow={value}
                        aria-label={label}
                    />
                </div>
            </div>
        </div>
    );
}

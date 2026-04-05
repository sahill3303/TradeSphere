/**
 * Input — dark-themed input with label and error support.
 * Props: id, label, error, type, value, onChange, placeholder, required, style, className
 */
export default function Input({
    id,
    label,
    error,
    type = 'text',
    value,
    onChange,
    placeholder = '',
    required = false,
    disabled = false,
    style,
    className = '',
}) {
    return (
        <div className={`form-group ${className}`} style={style}>
            {label && (
                <label htmlFor={id} className="form-label">
                    {label}
                    {required && <span className="required-mark"> *</span>}
                </label>
            )}
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                className={`form-input${error ? ' form-input--error' : ''}${disabled ? ' form-input--disabled' : ''}`}
            />
            {error && <p className="form-error">{error}</p>}
        </div>
    );
}

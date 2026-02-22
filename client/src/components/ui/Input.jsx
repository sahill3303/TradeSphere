/**
 * Input — controlled input with label and error support.
 * Props: id, label, error, type, value, onChange, placeholder, required
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
    className = '',
}) {
    return (
        <div className={`form-group ${className}`}>
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
                className={`form-input ${error ? 'form-input--error' : ''}`}
            />
            {error && <p className="form-error">{error}</p>}
        </div>
    );
}

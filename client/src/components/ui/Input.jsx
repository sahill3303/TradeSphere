/**
 * Input — dark-themed input with label, error support, and password visibility toggle.
 * Props: id, label, error, type, value, onChange, placeholder, required, style, className
 */
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
        <div className={`form-group ${className}`} style={style}>
            {label && (
                <label htmlFor={id} className="form-label">
                    {label}
                    {required && <span className="required-mark"> *</span>}
                </label>
            )}
            <div className={`form-input-wrapper${isPassword ? ' form-input-wrapper--has-toggle' : ''}`}>
                <input
                    id={id}
                    type={isPassword && showPassword ? 'text' : type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    className={`form-input${error ? ' form-input--error' : ''}${disabled ? ' form-input--disabled' : ''}`}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="form-input__eye-toggle"
                        onClick={() => setShowPassword(prev => !prev)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {error && <p className="form-error">{error}</p>}
        </div>
    );
}

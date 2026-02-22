/**
 * Button — reusable button component.
 * Props:
 *   variant: 'primary' | 'secondary' | 'danger'  (default: 'primary')
 *   size:    'sm' | 'md' | 'lg'                  (default: 'md')
 *   disabled, onClick, type, children
 */
export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    onClick,
    type = 'button',
    className = '',
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`btn btn--${variant} btn--${size} ${className}`}
        >
            {children}
        </button>
    );
}

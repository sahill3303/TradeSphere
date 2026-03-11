/**
 * Button — gold primary, dark secondary, danger red
 * Props: variant ('primary'|'secondary'|'danger'|'ghost'), type, disabled, onClick, style, children
 */
export default function Button({
    children,
    variant = 'secondary',
    type = 'button',
    disabled = false,
    onClick,
    style,
    className = '',
}) {
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={`btn btn--${variant} ${className}`}
            style={style}
        >
            {children}
        </button>
    );
}

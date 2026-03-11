/**
 * Card — surface container with gold-accented styling
 * Props: children, className, style, accent (adds gold top border)
 */
export default function Card({ children, className = '', style, accent }) {
    return (
        <div
            className={`card ${accent ? 'card--accent' : ''} ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}

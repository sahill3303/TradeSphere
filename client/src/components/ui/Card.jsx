/**
 * Card — surface container with shadow and rounded corners.
 * Props: className, children
 */
export default function Card({ children, className = '' }) {
    return (
        <div className={`card ${className}`}>
            {children}
        </div>
    );
}

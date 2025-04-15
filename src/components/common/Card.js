export default function Card({ title, children, className = '' }) {
    return (
        <div className={`content-card bg-white rounded-2xl shadow-md p-6 ${className}`}>
            {title && <h2 className="text-2xl font-bold mb-5 text-gray-800">{title}</h2>}
            {children}
        </div>
    );
}
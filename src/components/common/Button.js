export default function Button({
                                   children,
                                   onClick,
                                   variant = 'primary',
                                   className = '',
                                   disabled = false,
                                   type = 'button'
                               }) {
    const baseStyle = "py-3 px-6 rounded-lg font-medium transition-all duration-200";

    const variants = {
        primary: "bg-[#4285F4] text-white hover:bg-[#3367d6] shadow-sm hover:shadow",
        secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
        outline: "border-2 border-[#4285F4] text-[#4285F4] hover:bg-blue-50",
        selected: "bg-[#4285F4] text-white shadow-md",
        unselected: "bg-gray-200 text-gray-600"
    };

    return (
        <button
            type={type}
            className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
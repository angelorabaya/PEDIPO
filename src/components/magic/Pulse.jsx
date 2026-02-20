function Pulse({ children, className = "", color = "currentColor" }) {
    return (
        <span className={`magic-pulse relative inline-flex ${className}`}>
            {children}
            <span
                className="magic-pulse__ring absolute inset-0 rounded-full"
                style={{ "--pulse-color": color }}
            />
        </span>
    );
}

export default Pulse;

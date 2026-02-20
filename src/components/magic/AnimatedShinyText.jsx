function AnimatedShinyText({ children, className = "", speed = "3s" }) {
    return (
        <span
            className={`animated-shiny-text inline-block bg-clip-text ${className}`}
            style={{
                "--shiny-speed": speed,
            }}
        >
            {children}
        </span>
    );
}

export default AnimatedShinyText;

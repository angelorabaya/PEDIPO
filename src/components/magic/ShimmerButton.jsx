function ShimmerButton({
    children,
    shimmerColor = "#ffffff",
    shimmerSize = "0.05em",
    shimmerDuration = "3s",
    borderRadius = "100px",
    background = "rgba(0, 0, 0, 1)",
    className = "",
    ...props
}) {
    return (
        <button
            type="button"
            className={`shimmer-button group relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap px-6 py-2 font-medium transition-all hover:shadow-lg ${className}`}
            style={{
                "--shimmer-spread": shimmerSize,
                "--shimmer-speed": shimmerDuration,
                "--shimmer-cut": "0.1em",
                "--shimmer-bg": background,
                "--shimmer-color": shimmerColor,
                borderRadius,
            }}
            {...props}
        >
            {/* Shimmer spin layer */}
            <div className="shimmer-button__spin absolute inset-[calc(-1*var(--shimmer-cut))]" />

            {/* Background */}
            <div
                className="absolute inset-px z-[1] rounded-[inherit]"
                style={{ background }}
            />

            {/* Content */}
            <span className="shimmer-button__content relative z-[2] text-sm text-white/90 transition-colors group-hover:text-white">
                {children}
            </span>
        </button>
    );
}

export default ShimmerButton;

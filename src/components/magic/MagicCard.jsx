import { useCallback, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

function MagicCard({
    children,
    className = "",
    gradientSize = 200,
    gradientColor = "",
    gradientOpacity = 0.8,
    gradientFrom = "#9E7AFF",
    gradientTo = "#FE8BBB",
}) {
    const cardRef = useRef(null);
    const mouseX = useMotionValue(-gradientSize);
    const mouseY = useMotionValue(-gradientSize);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = useCallback(
        (e) => {
            if (!cardRef.current) return;
            const { left, top } = cardRef.current.getBoundingClientRect();
            mouseX.set(e.clientX - left);
            mouseY.set(e.clientY - top);
        },
        [mouseX, mouseY],
    );

    const handleMouseEnter = useCallback(() => setIsHovered(true), []);
    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        mouseX.set(-gradientSize);
        mouseY.set(-gradientSize);
    }, [mouseX, mouseY, gradientSize]);

    const background = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientColor || gradientFrom}, transparent 65%)
  `;

    const borderBackground = useMotionTemplate`
    radial-gradient(${gradientSize * 1.5}px circle at ${mouseX}px ${mouseY}px,
      ${gradientFrom}, ${gradientTo}, transparent 70%)
  `;

    return (
        <div
            ref={cardRef}
            className={`group relative overflow-hidden rounded-xl ${className}`}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Border glow */}
            <motion.div
                className="pointer-events-none absolute -inset-px z-[1] rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: borderBackground }}
            />

            {/* Inner card */}
            <div className="relative z-[2] h-full rounded-xl border border-base-300 bg-base-100 shadow-sm">
                {/* Spotlight overlay */}
                <motion.div
                    className="pointer-events-none absolute inset-0 z-[3] rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                        background,
                        opacity: isHovered ? gradientOpacity * 0.15 : 0,
                    }}
                />
                {/* Content */}
                <div className="relative z-[4]">{children}</div>
            </div>
        </div>
    );
}

export default MagicCard;

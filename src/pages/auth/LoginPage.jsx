import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import logo from "../../logo.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:4000`;

function LoginPage({ onLoginSuccess }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Login failed");
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            onLoginSuccess(data.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="flex min-h-[90vh] items-center justify-center px-4 relative z-10">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg"
            >
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-base-100/60 p-8 shadow-2xl backdrop-blur-2xl sm:p-12">
                    {/* Subtle top glare effect */}
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <div className="mb-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center"
                        >
                            <img src={logo} alt="PEDIPO Logo" className="h-full w-full object-contain drop-shadow-lg" />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-4xl font-extrabold tracking-tight"
                        >
                            Welcome to <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">PEDIPO</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mt-3 text-base font-medium text-base-content/60"
                        >
                            Sign in to manage economic development
                        </motion.p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <div className="form-control relative">
                                <input
                                    type="text"
                                    id="username"
                                    className="peer input input-bordered h-14 w-full bg-base-200/50 pb-2 pt-6 font-medium focus:border-primary focus:bg-base-200 focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder=" "
                                    required
                                    autoComplete="username"
                                />
                                <label
                                    htmlFor="username"
                                    className="pointer-events-none absolute start-4 top-2 text-xs font-semibold uppercase tracking-wider text-base-content/50 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-primary"
                                >
                                    Username
                                </label>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <div className="form-control relative">
                                <input
                                    type="password"
                                    id="password"
                                    className="peer input input-bordered h-14 w-full bg-base-200/50 pb-2 pt-6 font-medium focus:border-primary focus:bg-base-200 focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder=" "
                                    required
                                    autoComplete="current-password"
                                />
                                <label
                                    htmlFor="password"
                                    className="pointer-events-none absolute start-4 top-2 text-xs font-semibold uppercase tracking-wider text-base-content/50 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-primary"
                                >
                                    Password
                                </label>
                            </div>
                        </motion.div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="overflow-hidden"
                            >
                                <div className="alert alert-error mt-4 rounded-xl py-3 shadow-sm border border-error/20 bg-error/10 text-error">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="pt-2"
                        >
                            <button
                                type="submit"
                                className="btn btn-primary h-14 w-full rounded-2xl text-lg font-bold shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] hover:shadow-primary/40 active:scale-95"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="loading loading-spinner text-primary-content"></span>
                                ) : (
                                    "Sign In to Dashboard"
                                )}
                            </button>
                        </motion.div>
                    </form>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                        className="mt-8 text-center text-xs text-base-content/40"
                    >
                        Provincial Economic Development and Investment Promotion Office
                    </motion.p>
                </div>
            </motion.div>
        </div>
    );
}

export default LoginPage;

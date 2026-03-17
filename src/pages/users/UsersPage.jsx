import { useState, useRef, useMemo } from "react";
import FuzzySearch from "fuzzy-search";
import { formatDate } from "../../utils/dateUtils";

function UsersPage({
    users,
    onCreateUser,
    onUpdateUser,
    onDeleteUser,
    currentUserId,
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [editingItem, setEditingItem] = useState(null);

    // Form states
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("user");
    const [formError, setFormError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const modalRef = useRef(null);

    // Initialize Fuzzy Search
    const searcher = useMemo(() => {
        return new FuzzySearch(users, ["username", "email", "role"], {
            caseSensitive: false,
        });
    }, [users]);

    // Execute Search
    const displayItems = searchTerm ? searcher.search(searchTerm) : users;

    const handleOpenCreate = () => {
        setEditingItem(null);
        setUsername("");
        setEmail("");
        setPassword("");
        setRole("user");
        setFormError("");
        setIsSubmitting(false);
        modalRef.current?.showModal();
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setUsername(item.username);
        setEmail(item.email || "");
        setPassword(""); // Keep password empty initially when editing
        setRole(item.role);
        setFormError("");
        setIsSubmitting(false);
        modalRef.current?.showModal();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setIsSubmitting(true);

        try {
            if (editingItem) {
                // Prepare payload, omitting password if it wasn't typed in
                const payload = { username, role, email };
                if (password.trim() !== "") payload.password = password;

                await onUpdateUser(editingItem.id, payload);
            } else {
                await onCreateUser({ username, email, password, role });
            }
            modalRef.current?.close();
        } catch (err) {
            setFormError(err.message || "Failed to save user.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await onDeleteUser(id);
        } catch (err) {
            alert(err.message || "Failed to delete user.");
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="input input-bordered flex flex-1 items-center gap-2 bg-base-100 sm:max-w-xs shadow-sm">
                    <input
                        type="text"
                        className="grow transition-all"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-4 w-4 opacity-50 transition-colors hover:text-primary hover:opacity-100"
                    >
                        <path
                            fillRule="evenodd"
                            d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                            clipRule="evenodd"
                        />
                    </svg>
                </label>
                <button
                    className="btn btn-primary font-bold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    onClick={handleOpenCreate}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    New User
                </button>
            </div>

            <div className="card overflow-x-auto border border-base-300 bg-base-100 shadow-sm">
                <table className="table table-zebra w-full text-sm sm:text-base">
                    <thead>
                        <tr className="bg-base-200">
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Created At</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center font-medium text-base-content/60 py-8">
                                    No users found matching your search.
                                </td>
                            </tr>
                        ) : (
                            displayItems.map((item) => (
                                <tr key={item.id} className="hover">
                                    <td className="font-mono text-xs opacity-50">{item.id}</td>
                                    <td className="font-bold">
                                        {item.username}
                                        {currentUserId === item.id && (
                                            <span className="badge badge-primary badge-sm ml-2">You</span>
                                        )}
                                    </td>
                                    <td>{item.email || <span className="text-base-content/40 italic">Not set</span>}</td>
                                    <td>
                                        <span
                                            className={`badge badge-sm font-semibold uppercase tracking-wider ${item.role === 'admin' ? 'badge-secondary' : 'badge-ghost'
                                                }`}
                                        >
                                            {item.role}
                                        </span>
                                    </td>
                                    <td className="text-xs text-base-content/60">
                                        {formatDate(item.created_at, {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </td>
                                    <td className="text-right">
                                        {item.username !== "admin" && (
                                            <>
                                                <button
                                                    className="btn btn-ghost btn-xs mr-2 transition-transform hover:-translate-y-0.5"
                                                    onClick={() => handleOpenEdit(item)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-xs text-error transition-transform hover:-translate-y-0.5 hover:bg-error/10"
                                                    onClick={() => handleDelete(item.id)}
                                                    disabled={currentUserId === item.id}
                                                    title={currentUserId === item.id ? "You cannot delete your own account" : ""}
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <dialog ref={modalRef} className="modal">
                <div className="modal-box">
                    <h3 className="text-xl font-extrabold mb-1">
                        {editingItem ? "Edit User Account" : "Create New User"}
                    </h3>
                    <p className="text-sm text-base-content/60 mb-6">
                        Fill out the form below to {editingItem ? "update the profile" : "add a new user"}.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formError && (
                            <div className="alert alert-error">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6 shrink-0 stroke-current"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <span>{formError}</span>
                            </div>
                        )}

                        <label className="form-control w-full">
                            <div className="label pt-0">
                                <span className="label-text font-semibold">Username</span>
                                <span className="label-text-alt text-error">*</span>
                            </div>
                            <input
                                type="text"
                                placeholder="Ex. admin123"
                                className="input input-bordered w-full"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </label>

                        <label className="form-control w-full">
                            <div className="label pt-0">
                                <span className="label-text font-semibold">Email Address</span>
                                <span className="label-text-alt text-base-content/40">Optional</span>
                            </div>
                            <input
                                type="email"
                                placeholder="Ex. info@example.com"
                                className="input input-bordered w-full"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </label>

                        <label className="form-control w-full">
                            <div className="label pt-0">
                                <span className="label-text font-semibold">
                                    {editingItem ? "New Password" : "Password"}
                                </span>
                                {!editingItem && <span className="label-text-alt text-error">*</span>}
                            </div>
                            <input
                                type="password"
                                placeholder={editingItem ? "Leave empty to keep current password" : "Secure password"}
                                className="input input-bordered w-full"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required={!editingItem}
                            />
                            {editingItem && (
                                <div className="label">
                                    <span className="label-text-alt text-base-content/50">
                                        Only fill this out if you wish to reset their password.
                                    </span>
                                </div>
                            )}
                        </label>

                        <label className="form-control w-full">
                            <div className="label pt-0">
                                <span className="label-text font-semibold">Security Role</span>
                                <span className="label-text-alt text-error">*</span>
                            </div>
                            <select
                                className="select select-bordered w-full"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                required
                            >
                                <option value="user">Standard User</option>
                                <option value="admin">Administrator (Full Access)</option>
                            </select>
                        </label>

                        <div className="modal-action mt-6">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => modalRef.current?.close()}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary px-8 shadow-sm"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="loading loading-spinner text-primary-content" />
                                ) : editingItem ? (
                                    "Save Changes"
                                ) : (
                                    "Create User"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
                <form method="dialog" className="modal-backdrop bg-base-300/60 backdrop-blur-sm transition-all duration-300">
                    <button>close</button>
                </form>
            </dialog>
        </section>
    );
}

export default UsersPage;

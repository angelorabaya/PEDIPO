import { useState, useMemo, useRef, useEffect } from "react";
import FuzzySearch from "fuzzy-search";
import { formatDate } from "../../utils/dateUtils";

function ActivityLogsPage({ logs }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLog, setSelectedLog] = useState(null);
    const detailModalRef = useRef(null);
    const tableContainerRef = useRef(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15); // Initial fallback

    // Dynamic row calculation
    useEffect(() => {
        const calculateRows = () => {
            if (!tableContainerRef.current) return;
            const containerHeight = tableContainerRef.current.clientHeight;

            // DaisyUI table: Header ~48px, Row ~48px. We subtract the header height
            // and maybe a few pixels padding to ensure we don't cause vertical scrolling
            const headerHeight = 48; 
            const rowHeight = 48;
            
            const availableHeight = containerHeight - headerHeight - 10;
            const rows = Math.max(1, Math.floor(availableHeight / rowHeight));
            setItemsPerPage(rows);
            
            // Keep currentPage within valid bounds if itemsPerPage changes
            setCurrentPage(prev => {
                // Determine total pages with new itemsPerPage (rough estimate using logs.length or current length)
                return prev; // Or let the natural clamp happen next render
            });
        };

        // Small delay to ensure container height is accurately parsed after initial render mounting
        const timer = setTimeout(calculateRows, 50);
        window.addEventListener("resize", calculateRows);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", calculateRows);
        };
    }, []);

    // Initialize Fuzzy Search
    const searcher = useMemo(() => {
        return new FuzzySearch(logs, ["username", "action", "entity_type", "ip_address"], {
            caseSensitive: false,
        });
    }, [logs]);

    // Execute Search
    const filteredItems = searchTerm ? searcher.search(searchTerm) : logs;

    // Pagination Logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page to 1 on search or logs change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, logs]);

    const handleShowDetails = (log) => {
        setSelectedLog(log);
        detailModalRef.current?.showModal();
    };

    const parseJSON = (jsonStr) => {
        if (!jsonStr) return null;
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            return { error: "Invalid JSON", raw: jsonStr };
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="input input-bordered flex flex-1 items-center gap-2 bg-base-100 sm:max-w-xs shadow-sm">
                    <input
                        type="text"
                        className="grow"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-4 w-4 opacity-50"
                    >
                        <path
                            fillRule="evenodd"
                            d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                            clipRule="evenodd"
                        />
                    </svg>
                </label>
            </div>

            <div 
                ref={tableContainerRef}
                className="card h-[calc(100vh-16.5rem)] overflow-auto border border-base-300 bg-base-100 shadow-sm"
            >
                <table className="table table-zebra table-pin-rows w-full text-xs sm:text-sm">
                    <thead>
                        <tr className="bg-base-200">
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Entity</th>
                            <th>IP Address</th>
                            <th className="text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8 opacity-50">
                                    No activity logs found.
                                </td>
                            </tr>
                        ) : (
                            paginatedItems.map((log) => (
                                <tr key={log.id} className="hover">
                                    <td className="whitespace-nowrap">
                                        {formatDate(log.created_at, {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                    </td>
                                    <td className="font-bold">{log.username || "System"}</td>
                                    <td>
                                        <span
                                            className={`badge badge-sm font-bold ${log.action === "DELETE"
                                                    ? "badge-error"
                                                    : log.action === "UPDATE"
                                                        ? "badge-warning"
                                                        : log.action === "CREATE"
                                                            ? "badge-success"
                                                            : "badge-ghost"
                                                }`}
                                        >
                                            {log.action}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="opacity-70">{log.entity_type}</span>
                                        {log.entity_id && (
                                            <span className="ml-1 font-mono text-xs opacity-50">
                                                #{log.entity_id}
                                            </span>
                                        )}
                                    </td>
                                    <td className="font-mono text-xs opacity-60">
                                        {log.ip_address || "N/A"}
                                    </td>
                                    <td className="text-right">
                                        <button
                                            className="btn btn-ghost btn-xs"
                                            onClick={() => handleShowDetails(log)}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {filteredItems.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                    <span className="text-sm opacity-70">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries
                    </span>
                    <div className="join">
                        <button
                            className="join-item btn btn-sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                            «
                        </button>
                        <button className="join-item btn btn-sm pointer-events-none">
                            Page {currentPage} of {totalPages}
                        </button>
                        <button
                            className="join-item btn btn-sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                            »
                        </button>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            <dialog ref={detailModalRef} className="modal">
                <div className="modal-box w-11/12 max-w-4xl">
                    <h3 className="text-lg font-bold mb-4">Activity Details #{selectedLog?.id}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-sm font-semibold mb-2 opacity-60">Previous State</h4>
                            <div className="mockup-code text-xs bg-base-300 overflow-auto max-h-96">
                                <pre>
                                    <code>
                                        {selectedLog?.old_values
                                            ? JSON.stringify(parseJSON(selectedLog.old_values), null, 2)
                                            : "// No previous state available"}
                                    </code>
                                </pre>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-2 opacity-60">New State / Payload</h4>
                            <div className="mockup-code text-xs bg-slate-900 overflow-auto max-h-96">
                                <pre>
                                    <code>
                                        {selectedLog?.new_values
                                            ? JSON.stringify(parseJSON(selectedLog.new_values), null, 2)
                                            : "// No payload recorded"}
                                    </code>
                                </pre>
                            </div>
                        </div>
                    </div>

                    <div className="modal-action">
                        <form method="dialog">
                            <button className="btn">Close</button>
                        </form>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </section>
    );
}

export default ActivityLogsPage;

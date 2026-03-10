import { useEffect, useMemo, useRef, useState } from "react";

const BREAKPOINT_SM_PX = 640;
const BREAKPOINT_LG_PX = 1024;
const APPROX_ROW_HEIGHT_PX = 52;
const PAGINATION_GAP_PX = 32;
const VIEWPORT_BOTTOM_PADDING_PX = 24;
const CLIP_SAFETY_BUFFER_PX = 16;
const LAYOUT_SIZING = {
  mobile: {
    minRows: 5,
    maxRows: 10,
    reservedHeightPx: 500,
  },
  tablet: {
    minRows: 6,
    maxRows: 14,
    reservedHeightPx: 430,
  },
  desktop: {
    minRows: 7,
    maxRows: 22,
    reservedHeightPx: 360,
  },
};
const FEEDBACK_TIMEOUT_MS = 4000;
const MOVEMENT_TYPES = ["IN", "OUT", "ADJUSTMENT", "RETURN"];
const PAYMENT_STATUS_OPTIONS = ["Paid", "Consignment", "COD", "Payable", "N/A"];

function toDatetimeLocal(dateString) {
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function StockMovementsPage({
  stockMovements,
  products,
  onCreateStockMovement,
  onUpdateStockMovement,
  onDeleteStockMovement,
  isAdmin,
}) {
  const modalRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const tableHeadRef = useRef(null);
  const paginationRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(LAYOUT_SIZING.tablet.minRows);
  const [draft, setDraft] = useState({
    product_id: "",
    movement_type: "IN",
    quantity: 1,
    payment_status: "N/A",
    movement_date: toDatetimeLocal(new Date().toISOString()),
    remarks: "",
  });

  const productMap = useMemo(
    () => new Map(products.map((item) => [item.id, item.name])),
    [products],
  );

  const sortedMovements = useMemo(
    () =>
      [...stockMovements].sort(
        (a, b) => new Date(b.movement_date) - new Date(a.movement_date),
      ),
    [stockMovements],
  );
  const filteredMovements = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return sortedMovements;

    return sortedMovements.filter((item) => {
      const productName = productMap.get(item.product_id) ?? `Product #${item.product_id}`;
      return [
        item.id,
        productName,
        item.movement_type,
        item.quantity,
        item.payment_status,
        item.remarks,
        new Date(item.movement_date).toLocaleString(),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [productMap, searchQuery, sortedMovements]);

  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeoutId = setTimeout(() => setFeedback(null), FEEDBACK_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const updateRowsPerPage = () => {
      const sizing =
        window.innerWidth < BREAKPOINT_SM_PX
          ? LAYOUT_SIZING.mobile
          : window.innerWidth < BREAKPOINT_LG_PX
            ? LAYOUT_SIZING.tablet
            : LAYOUT_SIZING.desktop;

      const tableTop =
        tableWrapperRef.current?.getBoundingClientRect().top ??
        sizing.reservedHeightPx;
      const paginationHeight =
        paginationRef.current?.getBoundingClientRect().height ?? 48;
      const headerHeight = tableHeadRef.current?.getBoundingClientRect().height ?? 44;
      const firstBodyRow = tableWrapperRef.current?.querySelector("tbody tr");
      const measuredRowHeight =
        firstBodyRow?.getBoundingClientRect().height ?? APPROX_ROW_HEIGHT_PX;

      const availableHeight =
        window.innerHeight -
        tableTop -
        paginationHeight -
        PAGINATION_GAP_PX -
        VIEWPORT_BOTTOM_PADDING_PX -
        CLIP_SAFETY_BUFFER_PX;
      const rowsAreaHeight = Math.max(0, availableHeight - headerHeight);
      const calculatedRows = Math.floor(rowsAreaHeight / measuredRowHeight);
      const nextRowsPerPage = Math.max(
        sizing.minRows,
        Math.min(sizing.maxRows, calculatedRows),
      );
      setRowsPerPage(nextRowsPerPage);
    };

    const rafId = window.requestAnimationFrame(updateRowsPerPage);
    window.addEventListener("resize", updateRowsPerPage);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateRowsPerPage);
    };
  }, [filteredMovements.length]);

  const start = (currentPage - 1) * rowsPerPage;
  const pagedMovements = filteredMovements.slice(start, start + rowsPerPage);

  const openCreateModal = () => {
    const defaultProduct = products[0];
    setEditingId(null);
    setDraft({
      product_id: defaultProduct ? String(defaultProduct.id) : "",
      movement_type: "IN",
      quantity: 1,
      payment_status: "N/A",
      movement_date: toDatetimeLocal(new Date().toISOString()),
      remarks: "",
    });
    setFeedback(null);
    modalRef.current?.showModal();
  };

  const openEditModal = (movement) => {
    setEditingId(movement.id);
    setDraft({
      product_id: String(movement.product_id),
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      payment_status: movement.payment_status,
      movement_date: toDatetimeLocal(movement.movement_date),
      remarks: movement.remarks ?? "",
    });
    setFeedback(null);
    modalRef.current?.showModal();
  };

  const closeModal = () => {
    modalRef.current?.close();
    setEditingId(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const productId = Number(draft.product_id);
    const quantity = Number(draft.quantity);
    const movementDate = new Date(draft.movement_date);

    if (!productId || !productMap.has(productId)) {
      setFeedback({ type: "error", text: "Please select a valid product." });
      return;
    }
    if (!MOVEMENT_TYPES.includes(draft.movement_type)) {
      setFeedback({ type: "error", text: "Please select a valid movement type." });
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setFeedback({ type: "error", text: "Quantity must be a positive whole number." });
      return;
    }
    if (!PAYMENT_STATUS_OPTIONS.includes(draft.payment_status)) {
      setFeedback({ type: "error", text: "Please select a valid payment status." });
      return;
    }
    if (Number.isNaN(movementDate.getTime())) {
      setFeedback({ type: "error", text: "Please provide a valid movement date/time." });
      return;
    }

    const payload = {
      product_id: productId,
      movement_type: draft.movement_type,
      quantity,
      payment_status: draft.payment_status,
      movement_date: movementDate.toISOString(),
      remarks: draft.remarks.trim(),
    };

    try {
      if (editingId) {
        await onUpdateStockMovement(editingId, payload);
        setFeedback({ type: "success", text: "Stock movement updated successfully." });
      } else {
        await onCreateStockMovement(payload);
        setFeedback({ type: "success", text: "Stock movement recorded successfully." });
        setCurrentPage(1);
      }
      closeModal();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Failed to save stock movement.",
      });
    }
  };

  const handleDeleteMovement = async (id) => {
    const target = stockMovements.find((item) => item.id === id);
    if (!target) return;
    const isConfirmed = window.confirm(`Delete stock movement ID: ${target.id}?`);
    if (!isConfirmed) return;

    try {
      await onDeleteStockMovement(id);
      setFeedback({ type: "success", text: "Stock movement deleted successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Failed to delete stock movement.",
      });
    }
  };

  return (
    <section className="space-y-6">
      <article className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="mb-4 flex items-center justify-between">
            <label className="input input-bordered w-full max-w-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 opacity-70"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search stock movements"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateModal}
              disabled={products.length === 0}
            >
              Add Stock Movement
            </button>
          </div>

          {products.length === 0 ? (
            <div role="alert" className="alert alert-warning mb-4">
              <span>Add at least one product before recording stock movements.</span>
            </div>
          ) : null}

          {feedback ? (
            <div
              role="alert"
              className={`alert mb-4 ${feedback.type === "error" ? "alert-error" : "alert-success"
                }`}
            >
              <span>{feedback.text}</span>
            </div>
          ) : null}

          <div className="mb-2 flex items-center justify-between">
            <h3 className="card-title text-lg">Stock Movement List</h3>
            <span className="badge badge-outline">
              {filteredMovements.length} of {sortedMovements.length}
            </span>
          </div>

          <div ref={tableWrapperRef} className="overflow-x-auto">
            <table className="table">
              <thead ref={tableHeadRef}>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Payment Status</th>
                  <th>Movement Date</th>
                  <th>Remarks</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{movement.id}</td>
                    <td>
                      {productMap.get(movement.product_id) ?? `Product #${movement.product_id}`}
                    </td>
                    <td>
                      <span
                        className={`badge rounded-full ${movement.movement_type === "IN"
                            ? "badge-success"
                            : movement.movement_type === "OUT"
                              ? "badge-error"
                              : movement.movement_type === "ADJUSTMENT"
                                ? "badge-info"
                                : "badge-warning"
                          }`}
                      >
                        {movement.movement_type}
                      </span>
                    </td>
                    <td>{movement.quantity}</td>
                    <td>{movement.payment_status}</td>
                    <td>{new Date(movement.movement_date).toLocaleString()}</td>
                    <td className="max-w-56 truncate">{movement.remarks || "-"}</td>
                    <td className="text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline btn-info btn-square"
                          title="Edit"
                          aria-label={`Edit stock movement ${movement.id}`}
                          onClick={() => openEditModal(movement)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="size-4"
                          >
                            <path d="M3 17.25V21h3.75l11.02-11.02-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 000-1.42l-2.5-2.5a1.003 1.003 0 00-1.42 0l-1.96 1.96 3.75 3.75 2.13-1.79z" />
                          </svg>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline btn-error btn-square"
                            title="Delete"
                            aria-label={`Delete stock movement ${movement.id}`}
                            onClick={() => handleDeleteMovement(movement.id)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="size-4"
                            >
                              <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {pagedMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-base-content/70">
                      No stock movements found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div ref={paginationRef} className="mt-4 flex items-center justify-between">
            <p className="text-sm text-base-content/70">
              Showing {pagedMovements.length === 0 ? 0 : start + 1}-
              {start + pagedMovements.length} of {filteredMovements.length}
            </p>
            <div className="join">
              <button
                type="button"
                className="btn join-item btn-sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <button type="button" className="btn join-item btn-sm btn-ghost">
                Page {currentPage} / {totalPages}
              </button>
              <button
                type="button"
                className="btn join-item btn-sm"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </article>

      <dialog ref={modalRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">
            {editingId ? "Update Stock Movement" : "Add Stock Movement"}
          </h3>

          <form onSubmit={handleSave} className="space-y-3 pt-4">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Product</span>
              </div>
              <select
                className="select select-bordered w-full"
                value={draft.product_id}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, product_id: event.target.value }))
                }
              >
                <option value="">Select Product</option>
                {products
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Movement Type</span>
              </div>
              <select
                className="select select-bordered w-full"
                value={draft.movement_type}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    movement_type: event.target.value,
                  }))
                }
              >
                {MOVEMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Quantity</span>
              </div>
              <input
                type="number"
                min="1"
                step="1"
                className="input input-bordered w-full"
                value={draft.quantity}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, quantity: event.target.value }))
                }
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Payment Status</span>
              </div>
              <select
                className="select select-bordered w-full"
                value={draft.payment_status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    payment_status: event.target.value,
                  }))
                }
              >
                {PAYMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Movement Date</span>
              </div>
              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={draft.movement_date}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    movement_date: event.target.value,
                  }))
                }
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Remarks</span>
              </div>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Enter remarks"
                value={draft.remarks}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, remarks: event.target.value }))
                }
              />
            </label>

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingId ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>
    </section>
  );
}

export default StockMovementsPage;

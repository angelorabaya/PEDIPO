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

function SuppliersPage({
  suppliers,
  onCreateSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
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
    name: "",
    contact_person: "",
    phone_number: "",
    address: "",
  });

  const sortedSuppliers = useMemo(
    () => [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers],
  );
  const filteredSuppliers = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return sortedSuppliers;
    return sortedSuppliers.filter((item) =>
      [
        item.name,
        item.contact_person,
        item.phone_number,
        item.address,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [searchQuery, sortedSuppliers]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!feedback) return undefined;

    const timeoutId = setTimeout(() => {
      setFeedback(null);
    }, FEEDBACK_TIMEOUT_MS);

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
  }, [filteredSuppliers.length]);

  const start = (currentPage - 1) * rowsPerPage;
  const pagedSuppliers = filteredSuppliers.slice(start, start + rowsPerPage);

  const openCreateModal = () => {
    setEditingId(null);
    setDraft({
      name: "",
      contact_person: "",
      phone_number: "",
      address: "",
    });
    setFeedback(null);
    modalRef.current?.showModal();
  };

  const openEditModal = (supplier) => {
    setEditingId(supplier.id);
    setDraft({
      name: supplier.name,
      contact_person: supplier.contact_person ?? "",
      phone_number: supplier.phone_number ?? "",
      address: supplier.address ?? "",
    });
    setFeedback(null);
    modalRef.current?.showModal();
  };

  const closeModal = () => {
    modalRef.current?.close();
    setEditingId(null);
    setDraft({
      name: "",
      contact_person: "",
      phone_number: "",
      address: "",
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const payload = {
      name: draft.name.trim(),
      contact_person: draft.contact_person.trim(),
      phone_number: draft.phone_number.trim(),
      address: draft.address.trim(),
    };

    if (!payload.name) {
      setFeedback({ type: "error", text: "Supplier name is required." });
      return;
    }

    try {
      if (editingId) {
        await onUpdateSupplier(editingId, payload);
        setFeedback({ type: "success", text: "Supplier updated successfully." });
      } else {
        await onCreateSupplier(payload);
        setFeedback({ type: "success", text: "Supplier created successfully." });
        setCurrentPage(1);
      }
      closeModal();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Failed to save supplier.",
      });
    }
  };

  const handleDeleteSupplier = async (id) => {
    const target = suppliers.find((item) => item.id === id);
    if (!target) return;

    const isConfirmed = window.confirm(
      `Delete supplier "${target.name}" (ID: ${target.id})?`,
    );
    if (!isConfirmed) return;

    try {
      await onDeleteSupplier(id);
      setFeedback({ type: "success", text: "Supplier deleted successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Failed to delete supplier.",
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
                placeholder="Search suppliers"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              Add Supplier
            </button>
          </div>

          {feedback ? (
            <div
              role="alert"
              className={`alert mb-4 ${
                feedback.type === "error" ? "alert-error" : "alert-success"
              }`}
            >
              <span>{feedback.text}</span>
            </div>
          ) : null}

          <div className="mb-2 flex items-center justify-between">
            <h3 className="card-title text-lg">Supplier List</h3>
            <span className="badge badge-outline">
              {filteredSuppliers.length} of {sortedSuppliers.length}
            </span>
          </div>

          <div ref={tableWrapperRef} className="overflow-x-auto">
            <table className="table">
              <thead ref={tableHeadRef}>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Contact Person</th>
                  <th>Phone Number</th>
                  <th>Address</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>{supplier.id}</td>
                    <td>{supplier.name}</td>
                    <td>{supplier.contact_person || "-"}</td>
                    <td>{supplier.phone_number || "-"}</td>
                    <td className="max-w-64 truncate">{supplier.address || "-"}</td>
                    <td className="text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline btn-info btn-square"
                          aria-label={`Edit ${supplier.name}`}
                          title="Edit"
                          onClick={() => openEditModal(supplier)}
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
                        <button
                          type="button"
                          className="btn btn-sm btn-outline btn-error btn-square"
                          aria-label={`Delete ${supplier.name}`}
                          title="Delete"
                          onClick={() => handleDeleteSupplier(supplier.id)}
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
                      </div>
                    </td>
                  </tr>
                ))}
                {pagedSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-base-content/70">
                      No suppliers found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div ref={paginationRef} className="mt-4 flex items-center justify-between">
            <p className="text-sm text-base-content/70">
              Showing {pagedSuppliers.length === 0 ? 0 : start + 1}-
              {start + pagedSuppliers.length} of {filteredSuppliers.length}
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
            {editingId ? "Update Supplier" : "Add Supplier"}
          </h3>

          <form onSubmit={handleSave} className="space-y-3 pt-4">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Name</span>
              </div>
              <input
                autoFocus
                type="text"
                className="input input-bordered w-full"
                placeholder="Enter supplier name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Contact Person</span>
              </div>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Enter contact person"
                value={draft.contact_person}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    contact_person: event.target.value,
                  }))
                }
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Phone Number</span>
              </div>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Enter phone number"
                value={draft.phone_number}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    phone_number: event.target.value,
                  }))
                }
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Address</span>
              </div>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Enter address"
                value={draft.address}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, address: event.target.value }))
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

export default SuppliersPage;

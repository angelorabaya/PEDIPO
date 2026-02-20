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

function MunicipalitiesPage({
  municipalities,
  onCreateMunicipality,
  onUpdateMunicipality,
  onDeleteMunicipality,
}) {
  const modalRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const tableHeadRef = useRef(null);
  const paginationRef = useRef(null);
  const [draftName, setDraftName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(LAYOUT_SIZING.tablet.minRows);

  const sortedMunicipalities = useMemo(
    () => [...municipalities].sort((a, b) => a.name.localeCompare(b.name)),
    [municipalities],
  );
  const filteredMunicipalities = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return sortedMunicipalities;
    return sortedMunicipalities.filter((item) =>
      item.name.toLowerCase().includes(keyword),
    );
  }, [searchQuery, sortedMunicipalities]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMunicipalities.length / rowsPerPage),
  );

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
  }, [filteredMunicipalities.length]);

  const start = (currentPage - 1) * rowsPerPage;
  const pagedMunicipalities = filteredMunicipalities.slice(
    start,
    start + rowsPerPage,
  );

  const openCreateModal = () => {
    setEditingId(null);
    setDraftName("");
    setFeedback(null);
    modalRef.current?.showModal();
  };

  const openEditModal = (municipality) => {
    setEditingId(municipality.id);
    setDraftName(municipality.name);
    setFeedback(null);
    modalRef.current?.showModal();
  };

  const closeModal = () => {
    modalRef.current?.close();
    setEditingId(null);
    setDraftName("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const cleanedName = draftName.trim();

    if (!cleanedName) {
      setFeedback({ type: "error", text: "Municipality name is required." });
      return;
    }

    const duplicate = municipalities.find(
      (item) =>
        item.name.toLowerCase() === cleanedName.toLowerCase() &&
        item.id !== editingId,
    );
    if (duplicate) {
      setFeedback({
        type: "error",
        text: "Municipality name already exists. Please use a unique name.",
      });
      return;
    }

    try {
      if (editingId) {
        await onUpdateMunicipality(editingId, { name: cleanedName });
        setFeedback({ type: "success", text: "Municipality updated successfully." });
      } else {
        await onCreateMunicipality({ name: cleanedName });
        setFeedback({ type: "success", text: "Municipality created successfully." });
        setCurrentPage(1);
      }
      closeModal();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Failed to save municipality.",
      });
    }
  };

  const handleDeleteMunicipality = async (id) => {
    const target = municipalities.find((item) => item.id === id);
    if (!target) return;

    const isConfirmed = window.confirm(
      `Delete municipality "${target.name}" (ID: ${target.id})?`,
    );
    if (!isConfirmed) return;

    try {
      await onDeleteMunicipality(id);
      setFeedback({ type: "success", text: "Municipality deleted successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Failed to delete municipality.",
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
                placeholder="Search municipalities"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              Add Municipality
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
            <h3 className="card-title text-lg">Municipality List</h3>
            <span className="badge badge-outline">
              {filteredMunicipalities.length} of {sortedMunicipalities.length}
            </span>
          </div>

          <div ref={tableWrapperRef} className="overflow-x-auto">
            <table className="table">
              <thead ref={tableHeadRef}>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedMunicipalities.map((municipality) => (
                  <tr key={municipality.id}>
                    <td>{municipality.id}</td>
                    <td>{municipality.name}</td>
                    <td className="text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline btn-info btn-square"
                          aria-label={`Edit ${municipality.name}`}
                          title="Edit"
                          onClick={() => openEditModal(municipality)}
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
                          aria-label={`Delete ${municipality.name}`}
                          title="Delete"
                          onClick={() => handleDeleteMunicipality(municipality.id)}
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
                {pagedMunicipalities.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-base-content/70">
                      No municipalities found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div ref={paginationRef} className="mt-4 flex items-center justify-between">
            <p className="text-sm text-base-content/70">
              Showing {pagedMunicipalities.length === 0 ? 0 : start + 1}-
              {start + pagedMunicipalities.length} of {filteredMunicipalities.length}
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
            {editingId ? "Update Municipality" : "Add Municipality"}
          </h3>
          <p className="py-2 text-sm text-base-content/70">
            Enter municipality name.
          </p>

          <form onSubmit={handleSave}>
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Municipality Name</span>
              </div>
              <input
                autoFocus
                type="text"
                className="input input-bordered w-full"
                placeholder="Enter municipality name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
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

export default MunicipalitiesPage;

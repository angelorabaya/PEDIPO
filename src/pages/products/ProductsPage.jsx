import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function ProductsPage({
  products,
  municipalities,
  suppliers,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  isAdmin,
}) {
  const modalRef = useRef(null);
  const imagePreviewRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const tableHeadRef = useRef(null);
  const paginationRef = useRef(null);
  const fileInputRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(LAYOUT_SIZING.tablet.minRows);
  const [draft, setDraft] = useState({
    name: "",
    municipality_id: "",
    supplier_id: "",
    unit_price: "0.00",
    is_consignment: false,
    remarks: "",
    image: null,
  });

  const municipalityMap = useMemo(
    () => new Map(municipalities.map((item) => [item.id, item.name])),
    [municipalities],
  );
  const supplierMap = useMemo(
    () => new Map(suppliers.map((item) => [item.id, item.name])),
    [suppliers],
  );

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );
  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return sortedProducts;

    return sortedProducts.filter((item) => {
      const municipalityName = municipalityMap.get(item.municipality_id) ?? "";
      const supplierName = supplierMap.get(item.supplier_id) ?? "";
      return [
        item.name,
        municipalityName,
        supplierName,
        item.remarks,
        item.is_consignment ? "consignment" : "regular",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [municipalityMap, searchQuery, sortedProducts, supplierMap]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage));

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
  }, [filteredProducts.length]);

  const start = (currentPage - 1) * rowsPerPage;
  const pagedProducts = filteredProducts.slice(start, start + rowsPerPage);

  const handleImageChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", text: "Image must be smaller than 5 MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setDraft((current) => ({ ...current, image: e.target.result }));
    };
    reader.readAsDataURL(file);
  }, []);

  const removeImage = useCallback(() => {
    setDraft((current) => ({ ...current, image: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setDraft({
      name: "",
      municipality_id: "",
      supplier_id: "",
      unit_price: "0.00",
      is_consignment: false,
      remarks: "",
      image: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFeedback(null);
    modalRef.current?.showModal();
  };

  const openEditModal = (product) => {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      municipality_id:
        product.municipality_id === null ? "" : String(product.municipality_id),
      supplier_id: product.supplier_id === null ? "" : String(product.supplier_id),
      unit_price: Number(product.unit_price).toFixed(2),
      is_consignment: Boolean(product.is_consignment),
      remarks: product.remarks ?? "",
      image: product.image ?? null,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFeedback(null);
    modalRef.current?.showModal();
  };

  const closeModal = () => {
    modalRef.current?.close();
    setEditingId(null);
    setDraft({
      name: "",
      municipality_id: "",
      supplier_id: "",
      unit_price: "0.00",
      is_consignment: false,
      remarks: "",
      image: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const name = draft.name.trim();
    const parsedPrice = Number(draft.unit_price);

    if (!name) {
      setFeedback({ type: "error", text: "Product name is required." });
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFeedback({
        type: "error",
        text: "Unit price must be a valid non-negative number.",
      });
      return;
    }

    const municipalityId = draft.municipality_id ? Number(draft.municipality_id) : null;
    const isDuplicate = products.some(
      (item) =>
        item.id !== editingId &&
        item.name.toLowerCase() === name.toLowerCase() &&
        (item.municipality_id ?? null) === municipalityId,
    );
    if (isDuplicate) {
      setFeedback({
        type: "error",
        text: "A product with the same name and municipality already exists.",
      });
      return;
    }

    const payload = {
      name,
      municipality_id: draft.municipality_id ? Number(draft.municipality_id) : null,
      supplier_id: draft.supplier_id ? Number(draft.supplier_id) : null,
      unit_price: Number(parsedPrice.toFixed(2)),
      is_consignment: Boolean(draft.is_consignment),
      remarks: draft.remarks.trim(),
      image: draft.image || null,
    };

    try {
      if (editingId) {
        await onUpdateProduct(editingId, payload);
        setFeedback({ type: "success", text: "Product updated successfully." });
      } else {
        await onCreateProduct(payload);
        setFeedback({ type: "success", text: "Product created successfully." });
        setCurrentPage(1);
      }
      closeModal();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Failed to save product.",
      });
    }
  };

  const handleDeleteProduct = async (id) => {
    const target = products.find((item) => item.id === id);
    if (!target) return;

    const isConfirmed = window.confirm(
      `Delete product "${target.name}" (ID: ${target.id})?`,
    );
    if (!isConfirmed) return;

    try {
      await onDeleteProduct(id);
      setFeedback({ type: "success", text: "Product deleted successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Failed to delete product.",
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
                placeholder="Search products"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              Add Product
            </button>
          </div>

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
            <h3 className="card-title text-lg">Product List</h3>
            <span className="badge badge-outline">
              {filteredProducts.length} of {sortedProducts.length}
            </span>
          </div>

          <div ref={tableWrapperRef} className="overflow-x-auto">
            <table className="table">
              <thead ref={tableHeadRef}>
                <tr>
                  <th>ID</th>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Municipality</th>
                  <th>Supplier</th>
                  <th>Unit Price</th>
                  <th>Consignment</th>
                  <th>Remarks</th>
                  <th>Created At</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-10 w-10 cursor-pointer rounded object-cover transition-opacity hover:opacity-75"
                          onClick={() => {
                            setPreviewImage({ src: product.image, name: product.name });
                            imagePreviewRef.current?.showModal();
                          }}
                        />
                      ) : (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-base-200 text-base-content/40">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                            <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-5z" />
                          </svg>
                        </span>
                      )}
                    </td>
                    <td>{product.name}</td>
                    <td>{municipalityMap.get(product.municipality_id) ?? "-"}</td>
                    <td>{supplierMap.get(product.supplier_id) ?? "-"}</td>
                    <td>{Number(product.unit_price).toFixed(2)}</td>
                    <td>
                      <span
                        className={`badge rounded-full ${product.is_consignment ? "badge-success" : "badge-neutral"
                          }`}
                      >
                        {product.is_consignment ? "Consignment" : "Regular"}
                      </span>
                    </td>
                    <td className="max-w-56 truncate">{product.remarks || "-"}</td>
                    <td>{new Date(product.created_at).toLocaleString()}</td>
                    <td className="text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline btn-info btn-square"
                          aria-label={`Edit ${product.name}`}
                          title="Edit"
                          onClick={() => openEditModal(product)}
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
                            aria-label={`Delete ${product.name}`}
                            title="Delete"
                            onClick={() => handleDeleteProduct(product.id)}
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
                {pagedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center text-base-content/70">
                      No products found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div ref={paginationRef} className="mt-4 flex items-center justify-between">
            <p className="text-sm text-base-content/70">
              Showing {pagedProducts.length === 0 ? 0 : start + 1}-
              {start + pagedProducts.length} of {filteredProducts.length}
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
            {editingId ? "Update Product" : "Add Product"}
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
                placeholder="Enter product name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Municipality</span>
              </div>
              <select
                className="select select-bordered w-full"
                value={draft.municipality_id}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    municipality_id: event.target.value,
                  }))
                }
              >
                <option value="">None</option>
                {municipalities
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((municipality) => (
                    <option key={municipality.id} value={municipality.id}>
                      {municipality.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Supplier</span>
              </div>
              <select
                className="select select-bordered w-full"
                value={draft.supplier_id}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    supplier_id: event.target.value,
                  }))
                }
              >
                <option value="">None</option>
                {suppliers
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-semibold">Unit Price</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input input-bordered w-full"
                placeholder="0.00"
                value={draft.unit_price}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    unit_price: event.target.value,
                  }))
                }
              />
            </label>

            <div className="form-control pt-2">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={draft.is_consignment}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      is_consignment: event.target.checked,
                    }))
                  }
                />
                <span className="label-text font-semibold">Consignment Product</span>
              </label>
            </div>

            <label className="form-control w-full pt-1">
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

            <label className="form-control w-full pt-1">
              <div className="label">
                <span className="label-text font-semibold">Product Image</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="file-input file-input-bordered w-full"
                onChange={handleImageChange}
              />
            </label>

            {draft.image ? (
              <div className="mt-2 flex items-start gap-3">
                <img
                  src={draft.image}
                  alt="Preview"
                  className="h-24 w-24 rounded border border-base-300 object-cover"
                />
                <button
                  type="button"
                  className="btn btn-xs btn-error btn-outline"
                  onClick={removeImage}
                >
                  Remove
                </button>
              </div>
            ) : null}

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

      <dialog ref={imagePreviewRef} className="modal">
        <div className="modal-box max-w-2xl p-4">
          {previewImage ? (
            <>
              <h3 className="mb-3 text-lg font-bold">{previewImage.name}</h3>
              <img
                src={previewImage.src}
                alt={previewImage.name}
                className="w-full rounded object-contain"
              />
            </>
          ) : null}
          <div className="modal-action">
            <form method="dialog">
              <button type="submit" className="btn btn-ghost">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>
    </section>
  );
}

export default ProductsPage;

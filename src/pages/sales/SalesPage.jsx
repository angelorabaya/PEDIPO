import { useEffect, useMemo, useRef, useState } from "react";
import { formatDate } from "../../utils/dateUtils";

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

function toDatetimeLocal(dateString) {
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function SalesPage({
  sales,
  products,
  stockMovements,
  onCreateSale,
  onUpdateSale,
  onDeleteSale,
  isAdmin,
}) {
  const modalRef = useRef(null);
  const imagePreviewRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const tableHeadRef = useRef(null);
  const paginationRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(LAYOUT_SIZING.tablet.minRows);
  const [draft, setDraft] = useState({
    product_id: "",
    quantity: 1,
    unit_price: "0.00",
    sale_date: toDatetimeLocal(new Date().toISOString()),
  });

  const productMap = useMemo(
    () => new Map(products.map((item) => [item.id, item.name])),
    [products],
  );
  const productImageMap = useMemo(
    () => new Map(products.map((item) => [item.id, item.image ?? null])),
    [products],
  );
  const stockByProduct = useMemo(() => {
    const stock = new Map(products.map((item) => [item.id, 0]));
    for (const movement of stockMovements) {
      if (!stock.has(movement.product_id)) continue;
      if (movement.movement_type === "IN") {
        stock.set(movement.product_id, stock.get(movement.product_id) + movement.quantity);
      } else if (movement.movement_type === "OUT") {
        stock.set(movement.product_id, stock.get(movement.product_id) - movement.quantity);
      }
    }
    return stock;
  }, [products, stockMovements]);

  const sortedSales = useMemo(
    () => [...sales].sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date)),
    [sales],
  );
  const filteredSales = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return sortedSales;

    return sortedSales.filter((item) => {
      const productName = productMap.get(item.product_id) ?? `Product #${item.product_id}`;
      return [
        item.id,
        productName,
        item.quantity,
        Number(item.unit_price).toFixed(2),
        Number(item.quantity * item.unit_price).toFixed(2),
        formatDate(item.sale_date),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [productMap, searchQuery, sortedSales]);
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / rowsPerPage));

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
  }, [filteredSales.length]);

  const start = (currentPage - 1) * rowsPerPage;
  const pagedSales = filteredSales.slice(start, start + rowsPerPage);

  const openCreateModal = () => {
    const defaultProduct = products[0];
    setEditingId(null);
    setDraft({
      product_id: defaultProduct ? String(defaultProduct.id) : "",
      quantity: 1,
      unit_price: defaultProduct ? Number(defaultProduct.unit_price).toFixed(2) : "0.00",
      sale_date: toDatetimeLocal(new Date().toISOString()),
    });
    setFeedback(null);
    modalRef.current?.showModal();
  };

  const openEditModal = (sale) => {
    setEditingId(sale.id);
    setDraft({
      product_id: String(sale.product_id),
      quantity: sale.quantity,
      unit_price: Number(sale.unit_price).toFixed(2),
      sale_date: toDatetimeLocal(sale.sale_date),
    });
    setFeedback(null);
    modalRef.current?.showModal();
  };

  const closeModal = () => {
    modalRef.current?.close();
    setEditingId(null);
  };

  const handleProductChange = (value) => {
    const selected = products.find((item) => item.id === Number(value));
    setDraft((current) => ({
      ...current,
      product_id: value,
      unit_price: selected ? Number(selected.unit_price).toFixed(2) : current.unit_price,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const productId = Number(draft.product_id);
    const quantity = Number(draft.quantity);
    const unitPrice = Number(draft.unit_price);
    const saleDate = new Date(draft.sale_date);

    if (!productId || !productMap.has(productId)) {
      setFeedback({ type: "error", text: "Please select a valid product." });
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setFeedback({ type: "error", text: "Quantity must be a positive whole number." });
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setFeedback({
        type: "error",
        text: "Unit price must be a valid non-negative number.",
      });
      return;
    }
    if (Number.isNaN(saleDate.getTime())) {
      setFeedback({ type: "error", text: "Please provide a valid sale date/time." });
      return;
    }

    const soldForProduct = sales
      .filter(
        (item) => item.product_id === productId && (editingId ? item.id !== editingId : true),
      )
      .reduce((sum, item) => sum + item.quantity, 0);
    const availableStock = (stockByProduct.get(productId) ?? 0) - soldForProduct;

    if (quantity > availableStock) {
      setFeedback({
        type: "error",
        text: `Quantity exceeds available stock (${availableStock}).`,
      });
      return;
    }

    const payload = {
      product_id: productId,
      quantity,
      unit_price: Number(unitPrice.toFixed(2)),
      sale_date: saleDate.toISOString(),
    };

    try {
      if (editingId) {
        await onUpdateSale(editingId, payload);
        setFeedback({ type: "success", text: "Sale updated successfully." });
      } else {
        await onCreateSale(payload);
        setFeedback({ type: "success", text: "Sale recorded successfully." });
        setCurrentPage(1);
      }
      closeModal();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Failed to save sale.",
      });
    }
  };

  const selectedProductId = Number(draft.product_id);
  const soldForSelected = sales
    .filter(
      (item) =>
        item.product_id === selectedProductId &&
        (editingId ? item.id !== editingId : true),
    )
    .reduce((sum, item) => sum + item.quantity, 0);
  const availableForSelected =
    selectedProductId && productMap.has(selectedProductId)
      ? (stockByProduct.get(selectedProductId) ?? 0) - soldForSelected
      : 0;

  const handleDeleteSale = async (id) => {
    const target = sales.find((item) => item.id === id);
    if (!target) return;
    const isConfirmed = window.confirm(`Delete sale record ID: ${target.id}?`);
    if (!isConfirmed) return;

    try {
      await onDeleteSale(id);
      setFeedback({ type: "success", text: "Sale deleted successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Failed to delete sale.",
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
                placeholder="Search sales"
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
              Add Sale
            </button>
          </div>

          {products.length === 0 ? (
            <div role="alert" className="alert alert-warning mb-4">
              <span>Add at least one product before recording sales.</span>
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
            <h3 className="card-title text-lg">Sales List</h3>
            <span className="badge badge-outline">
              {filteredSales.length} of {sortedSales.length}
            </span>
          </div>

          <div ref={tableWrapperRef} className="overflow-x-auto">
            <table className="table">
              <thead ref={tableHeadRef}>
                <tr>
                  <th>ID</th>
                  <th>Image</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Amount</th>
                  <th>Sale Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.id}</td>
                    <td>
                      {productImageMap.get(sale.product_id) ? (
                        <img
                          src={productImageMap.get(sale.product_id)}
                          alt={productMap.get(sale.product_id) ?? "Product"}
                          className="h-10 w-10 cursor-pointer rounded object-cover transition-opacity hover:opacity-75"
                          onClick={() => {
                            setPreviewImage({
                              src: productImageMap.get(sale.product_id),
                              name: productMap.get(sale.product_id) ?? "Product",
                            });
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
                    <td>{productMap.get(sale.product_id) ?? `Product #${sale.product_id}`}</td>
                    <td>{sale.quantity}</td>
                    <td>{Number(sale.unit_price).toFixed(2)}</td>
                    <td>{Number(sale.quantity * sale.unit_price).toFixed(2)}</td>
                    <td>{formatDate(sale.sale_date)}</td>
                    <td className="text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline btn-info btn-square"
                          title="Edit"
                          aria-label={`Edit sale ${sale.id}`}
                          onClick={() => openEditModal(sale)}
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
                            aria-label={`Delete sale ${sale.id}`}
                            onClick={() => handleDeleteSale(sale.id)}
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
                {pagedSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-base-content/70">
                      No sales found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div ref={paginationRef} className="mt-4 flex items-center justify-between">
            <p className="text-sm text-base-content/70">
              Showing {pagedSales.length === 0 ? 0 : start + 1}-{start + pagedSales.length} of{" "}
              {filteredSales.length}
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
        <div className="modal-box max-w-3xl">
          <h3 className="text-lg font-bold">{editingId ? "Update Sale" : "Add Sale"}</h3>

          <form onSubmit={handleSave} className="pt-4">
            <div className="flex gap-6">
              <div className="flex-1 space-y-3">
                <label className="form-control w-full">
                  <div className="label">
                    <span className="label-text font-semibold">Product</span>
                  </div>
                  <select
                    className="select select-bordered w-full"
                    value={draft.product_id}
                    onChange={(event) => handleProductChange(event.target.value)}
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
                    <span className="label-text font-semibold">Quantity</span>
                    <span className="label-text-alt text-base-content/70">
                      Available: {availableForSelected}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    max={Math.max(0, availableForSelected)}
                    className="input input-bordered w-full"
                    value={draft.quantity}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, quantity: event.target.value }))
                    }
                  />
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
                    value={draft.unit_price}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, unit_price: event.target.value }))
                    }
                  />
                </label>

                <label className="form-control w-full">
                  <div className="label">
                    <span className="label-text font-semibold">Sale Date</span>
                  </div>
                  <input
                    type="datetime-local"
                    className="input input-bordered w-full"
                    value={draft.sale_date}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, sale_date: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="flex flex-col items-center gap-2 pt-8">
                <div className="flex h-[200px] w-[200px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-base-300 bg-base-200">
                  {draft.product_id && productImageMap.get(Number(draft.product_id)) ? (
                    <img
                      src={productImageMap.get(Number(draft.product_id))}
                      alt={productMap.get(Number(draft.product_id)) ?? "Product"}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-base-content/30">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-12">
                        <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-5z" />
                      </svg>
                      <span className="text-xs">No Image</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-base-content/50">Product Image</span>
              </div>
            </div>

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

export default SalesPage;

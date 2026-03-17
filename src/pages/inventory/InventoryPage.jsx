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

function InventoryPage({ municipalities, products, sales, stockMovements }) {
  const tableWrapperRef = useRef(null);
  const tableHeadRef = useRef(null);
  const paginationRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(LAYOUT_SIZING.tablet.minRows);
  const [searchTerm, setSearchTerm] = useState("");

  // Build a municipality lookup map
  const municipalityMap = useMemo(() => {
    const map = new Map();
    for (const m of municipalities) {
      map.set(m.id, m.name);
    }
    return map;
  }, [municipalities]);

  const inventoryRows = useMemo(() => {
    const rows = products.map((product) => ({
      product_id: product.id,
      product_name: product.name,
      municipality_id: product.municipality_id,
      municipality_name: municipalityMap.get(product.municipality_id) || "",
      quantity_on_hand: 0,
      last_updated: product.created_at ?? null,
    }));
    const rowMap = new Map(rows.map((row) => [row.product_id, row]));

    for (const movement of stockMovements) {
      const row = rowMap.get(movement.product_id);
      if (!row) continue;

      if (movement.movement_type === "IN" || movement.movement_type === "RETURN") {
        row.quantity_on_hand += movement.quantity;
      } else if (movement.movement_type === "OUT" || movement.movement_type === "ADJUSTMENT") {
        row.quantity_on_hand -= movement.quantity;
      }

      row.last_updated = movement.movement_date;
    }

    for (const sale of sales) {
      const row = rowMap.get(sale.product_id);
      if (!row) continue;
      row.quantity_on_hand -= sale.quantity;
      row.last_updated = sale.sale_date;
    }

    // Sort by municipality name then product name
    return rows.sort((a, b) => {
      const muniCmp = a.municipality_name.localeCompare(b.municipality_name);
      if (muniCmp !== 0) return muniCmp;
      return a.product_name.localeCompare(b.product_name);
    });
  }, [products, sales, stockMovements, municipalityMap]);

  // Filter rows based on search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return inventoryRows;
    const term = searchTerm.toLowerCase();
    return inventoryRows.filter(
      (row) =>
        row.municipality_name.toLowerCase().includes(term) ||
        row.product_name.toLowerCase().includes(term),
    );
  }, [inventoryRows, searchTerm]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
  }, [filteredRows.length]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const start = (safeCurrentPage - 1) * rowsPerPage;
  const pagedRows = filteredRows.slice(start, start + rowsPerPage);

  // Track which municipality names were already shown so only the first occurrence displays
  const shownMunicipalities = new Set();

  return (
    <section className="space-y-6">
      <article className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="card-title text-lg">Inventory Levels</h3>
            <span className="badge badge-outline">{filteredRows.length} products</span>
          </div>

          <div className="mb-3">
            <input
              type="text"
              placeholder="Search by municipality or product..."
              className="input input-bordered input-sm w-full max-w-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div ref={tableWrapperRef} className="overflow-x-auto">
            <table className="table">
              <thead ref={tableHeadRef}>
                <tr>
                  <th>Municipality</th>
                  <th>Product</th>
                  <th>Quantity On Hand</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => {
                  const showMunicipality = !shownMunicipalities.has(row.municipality_name);
                  if (showMunicipality) shownMunicipalities.add(row.municipality_name);

                  return (
                    <tr key={row.product_id}>
                      <td>{showMunicipality ? row.municipality_name : ""}</td>
                      <td>{row.product_name}</td>
                      <td>
                        <span>{row.quantity_on_hand}</span>
                      </td>
                      <td>
                        {row.quantity_on_hand === 0 ? (
                          <span className="badge badge-warning rounded-full">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="badge badge-success rounded-full">In Stock</span>
                        )}
                      </td>
                      <td>
                        {formatDate(row.last_updated)}
                      </td>
                    </tr>
                  );
                })}
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-base-content/70">
                      No products available.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div ref={paginationRef} className="mt-4 flex items-center justify-between">
            <p className="text-sm text-base-content/70">
              Showing {pagedRows.length === 0 ? 0 : start + 1}-{start + pagedRows.length} of{" "}
              {filteredRows.length}
            </p>
            <div className="join">
              <button
                type="button"
                className="btn join-item btn-sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
              >
                Prev
              </button>
              <button type="button" className="btn join-item btn-sm btn-ghost">
                Page {safeCurrentPage} / {totalPages}
              </button>
              <button
                type="button"
                className="btn join-item btn-sm"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

export default InventoryPage;

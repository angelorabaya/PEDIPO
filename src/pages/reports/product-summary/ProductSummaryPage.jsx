import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

function ProductSummaryPage() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/inventory`);
      if (!res.ok) throw new Error(`Failed to load report (${res.status})`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load report.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Group rows by municipality (preserving query order)
  const grouped = rows.reduce((acc, row) => {
    const key = row.municipality || "";
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(row);
    return acc;
  }, new Map());

  const grandTotal = rows.reduce(
    (sum, r) => sum + Number(r.total_value || 0),
    0,
  );

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body items-center">
          <span className="loading loading-spinner loading-md" />
          <p className="text-sm text-base-content/70">Loading report...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card border border-error/30 bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-error">Report Error</h2>
          <p>{error}</p>
          <div className="card-actions">
            <button type="button" className="btn btn-error btn-outline" onClick={loadReport}>
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Print button — hidden during print */}
      <div className="flex justify-end print:hidden">
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
          </svg>
          Print Report
        </button>
      </div>

      {/* A4 printable sheet */}
      <article
        className="report-sheet mx-auto border border-base-300 bg-white p-10 shadow-sm print:border-none print:shadow-none"
        style={{
          width: "210mm",
          minHeight: "297mm",
          color: "#000",
        }}
      >
        {/* Report header */}
        <header className="mb-6 text-center">
          <h1 className="text-base font-bold uppercase leading-tight">
            Provincial Economic Development and Investment Promotion Office (PEDIPO)
          </h1>
          <p className="text-sm">
            Provincial Capitol Ground, Velez St., Cagayan de Oro City
          </p>
          <div className="mt-4" />
          <h2 className="text-lg font-bold uppercase tracking-wide">
            Product Summary
          </h2>
        </header>

        {/* Data table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="px-2 py-1.5 text-left font-semibold">MUNICIPALITY</th>
              <th className="px-2 py-1.5 text-left font-semibold">PRODUCT</th>
              <th className="px-2 py-1.5 text-right font-semibold">QUANTITY</th>
              <th className="px-2 py-1.5 text-right font-semibold">UNIT PRICE</th>
              <th className="px-2 py-1.5 text-right font-semibold">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-gray-500">
                  No inventory data found.
                </td>
              </tr>
            ) : (
              Array.from(grouped.entries()).map(([municipality, items]) => {
                const subtotal = items.reduce(
                  (sum, r) => sum + Number(r.total_value || 0),
                  0,
                );
                return items.map((row, idx) => (
                  <tr key={`${municipality}-${idx}`} className={"border-b border-gray-300"}>
                    <td className="px-2 py-1">
                      {idx === 0 ? municipality : ""}
                    </td>
                    <td className="px-2 py-1">{row.product_name}</td>
                    <td className="px-2 py-1 text-right">{row.quantity_on_hand}</td>
                    <td className="px-2 py-1 text-right">
                      {Number(row.unit_price).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {Number(row.total_value).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                )).concat(
                  <tr key={`sub-${municipality}`} className="border-b border-gray-400 bg-gray-50 font-semibold">
                    <td className="px-2 py-1"></td>
                    <td colSpan={3} className="px-2 py-1 text-right">Sub-Total</td>
                    <td className="px-2 py-1 text-right">
                      {subtotal.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {rows.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-black font-bold">
                <td colSpan={4} className="px-2 py-2 text-right">GRAND TOTAL</td>
                <td className="px-2 py-2 text-right">
                  {grandTotal.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </article>
    </section>
  );
}

export default ProductSummaryPage;

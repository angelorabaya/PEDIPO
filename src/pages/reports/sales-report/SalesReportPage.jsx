import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:4000`;

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function SalesReportPage() {
    const modalRef = useRef(null);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [confirmedFrom, setConfirmedFrom] = useState(null);
    const [confirmedTo, setConfirmedTo] = useState(null);
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Show modal on mount
    useEffect(() => {
        modalRef.current?.showModal();
    }, []);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const [salesRes, productsRes, muniRes, suppRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/sales`, { headers }),
                fetch(`${API_BASE_URL}/api/products`, { headers }),
                fetch(`${API_BASE_URL}/api/municipalities`, { headers }),
                fetch(`${API_BASE_URL}/api/suppliers`, { headers }),
            ]);
            if (!salesRes.ok) throw new Error(`Failed to load sales (${salesRes.status})`);
            if (!productsRes.ok) throw new Error(`Failed to load products (${productsRes.status})`);
            if (!muniRes.ok) throw new Error(`Failed to load municipalities (${muniRes.status})`);
            if (!suppRes.ok) throw new Error(`Failed to load suppliers (${suppRes.status})`);
            const [salesData, productsData, muniData, suppData] = await Promise.all([
                salesRes.json(),
                productsRes.json(),
                muniRes.json(),
                suppRes.json(),
            ]);
            setSales(Array.isArray(salesData) ? salesData : []);
            setProducts(Array.isArray(productsData) ? productsData : []);
            setMunicipalities(Array.isArray(muniData) ? muniData : []);
            setSuppliers(Array.isArray(suppData) ? suppData : []);
        } catch (err) {
            setError(err.message || "Failed to load report.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleGenerate = (e) => {
        e.preventDefault();
        if (!dateFrom || !dateTo) return;
        setConfirmedFrom(dateFrom);
        setConfirmedTo(dateTo);
        modalRef.current?.close();
        loadData();
    };

    const handleChangeDates = () => {
        modalRef.current?.showModal();
    };

    const productMap = new Map(products.map((p) => [p.id, p]));
    const muniMap = new Map(municipalities.map((m) => [m.id, m.name]));
    const suppMap = new Map(suppliers.map((s) => [s.id, s.name]));

    // Filter by confirmed date range, enrich, and sort
    const enrichedSales = sales
        .filter((sale) => {
            if (!confirmedFrom || !confirmedTo) return false;
            const saleDate = new Date(sale.sale_date);
            const from = new Date(confirmedFrom);
            const to = new Date(confirmedTo);
            to.setHours(23, 59, 59, 999);
            return saleDate >= from && saleDate <= to;
        })
        .map((sale) => {
            const product = productMap.get(sale.product_id);
            return {
                ...sale,
                productName: product?.name || `Product #${sale.product_id}`,
                municipalityName: product?.municipality_id
                    ? muniMap.get(product.municipality_id) || ""
                    : "",
                supplierName: product?.supplier_id
                    ? suppMap.get(product.supplier_id) || ""
                    : "",
                amount: Number(sale.total_amount || sale.quantity * sale.unit_price || 0),
            };
        })
        .sort((a, b) => {
            const dateCmp = new Date(a.sale_date) - new Date(b.sale_date);
            if (dateCmp !== 0) return dateCmp;
            const muniCmp = a.municipalityName.localeCompare(b.municipalityName);
            if (muniCmp !== 0) return muniCmp;
            return a.productName.localeCompare(b.productName);
        });

    const grandTotal = enrichedSales.reduce((sum, s) => sum + s.amount, 0);
    const totalQuantity = enrichedSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);

    const handlePrint = () => window.print();

    // Date range modal
    const dateModal = (
        <dialog ref={modalRef} className="modal">
            <div className="modal-box">
                <h3 className="text-lg font-bold">Sales Report Date Range</h3>
                <form onSubmit={handleGenerate} className="space-y-4 pt-4">
                    <label className="form-control w-full">
                        <div className="label">
                            <span className="label-text font-semibold">From</span>
                        </div>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            required
                        />
                    </label>
                    <label className="form-control w-full">
                        <div className="label">
                            <span className="label-text font-semibold">To</span>
                        </div>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            required
                        />
                    </label>
                    <div className="modal-action">
                        <button type="submit" className="btn btn-primary" disabled={!dateFrom || !dateTo}>
                            Generate Report
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button type="submit">close</button>
            </form>
        </dialog>
    );

    // Before date range is confirmed, show nothing but the modal
    if (!confirmedFrom || !confirmedTo) {
        return <section>{dateModal}</section>;
    }

    if (isLoading) {
        return (
            <section>
                {dateModal}
                <div className="card border border-base-300 bg-base-100 shadow-sm">
                    <div className="card-body items-center">
                        <span className="loading loading-spinner loading-md" />
                        <p className="text-sm text-base-content/70">Loading report...</p>
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section>
                {dateModal}
                <div className="card border border-error/30 bg-base-100 shadow-sm">
                    <div className="card-body">
                        <h2 className="card-title text-error">Report Error</h2>
                        <p>{error}</p>
                        <div className="card-actions">
                            <button type="button" className="btn btn-error btn-outline" onClick={loadData}>
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            {dateModal}
            {/* Landscape print style */}
            <style>{`@media print { @page { size: landscape; } }`}</style>

            {/* Action buttons — hidden during print */}
            <div className="flex justify-end gap-2 print:hidden">
                <button type="button" className="btn btn-outline" onClick={handleChangeDates}>
                    Change Date Range
                </button>
                <button type="button" className="btn btn-primary" onClick={handlePrint}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                    </svg>
                    Print Report
                </button>
            </div>

            {/* A4 Landscape printable sheet */}
            <article
                className="report-sheet mx-auto border border-base-300 bg-white p-10 shadow-sm print:border-none print:shadow-none"
                style={{
                    width: "297mm",
                    minHeight: "210mm",
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
                        Sales Report
                    </h2>
                    <p className="mt-1 text-sm">
                        {formatDate(confirmedFrom)} — {formatDate(confirmedTo)}
                    </p>
                </header>

                {/* Data table */}
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="px-2 py-1.5 text-left font-semibold">DATE</th>
                            <th className="px-2 py-1.5 text-left font-semibold">MUNICIPALITY</th>
                            <th className="px-2 py-1.5 text-left font-semibold">PRODUCT</th>
                            <th className="px-2 py-1.5 text-left font-semibold">SUPPLIER</th>
                            <th className="px-2 py-1.5 text-right font-semibold">QUANTITY</th>
                            <th className="px-2 py-1.5 text-right font-semibold">UNIT PRICE</th>
                            <th className="px-2 py-1.5 text-right font-semibold">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enrichedSales.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-2 py-4 text-center text-gray-500">
                                    No sales data found for the selected date range.
                                </td>
                            </tr>
                        ) : (
                            enrichedSales.map((sale, idx) => {
                                const prevMuni = idx > 0 ? enrichedSales[idx - 1].municipalityName : null;
                                const showMuni = sale.municipalityName !== prevMuni;
                                return (
                                    <tr key={sale.id} className="border-b border-gray-300">
                                        <td className="px-2 py-1">
                                            {new Date(sale.sale_date).toLocaleDateString("en-PH", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </td>
                                        <td className="px-2 py-1">{showMuni ? sale.municipalityName : ""}</td>
                                        <td className="px-2 py-1">{sale.productName}</td>
                                        <td className="px-2 py-1">{sale.supplierName}</td>
                                        <td className="px-2 py-1 text-right">{sale.quantity}</td>
                                        <td className="px-2 py-1 text-right">
                                            {Number(sale.unit_price).toLocaleString("en-PH", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td className="px-2 py-1 text-right">
                                            {sale.amount.toLocaleString("en-PH", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {enrichedSales.length > 0 ? (
                        <tfoot>
                            <tr className="border-t-2 border-black font-bold">
                                <td colSpan={4} className="px-2 py-2 text-right">GRAND TOTAL</td>
                                <td className="px-2 py-2 text-right">{totalQuantity}</td>
                                <td className="px-2 py-2" />
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

export default SalesReportPage;

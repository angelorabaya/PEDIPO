import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DashboardPage from "./pages/dashboard/DashboardPage";
import InventoryPage from "./pages/inventory/InventoryPage";
import AnimatedGridBackground from "./components/magic/AnimatedGridBackground";
import AnimatedShinyText from "./components/magic/AnimatedShinyText";
import BlurReveal from "./components/magic/BlurReveal";
import MunicipalitiesPage from "./pages/municipalities/MunicipalitiesPage";
import ProductsPage from "./pages/products/ProductsPage";
import ProductSummaryPage from "./pages/reports/product-summary/ProductSummaryPage";
import SalesReportPage from "./pages/reports/sales-report/SalesReportPage";
import SalesPage from "./pages/sales/SalesPage";
import StockMovementsPage from "./pages/stock-movements/StockMovementsPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const VALID_PAGES = new Set([
  "dashboard",
  "municipalities",
  "suppliers",
  "products",
  "inventory",
  "sales",
  "stock-movements",
  "product-summary",
  "sales-report",
]);

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" && data?.error
        ? data.error
        : `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return data;
}

function normalizeProducts(rows) {
  return rows.map((item) => ({
    ...item,
    is_consignment: Boolean(item.is_consignment),
    unit_price: Number(item.unit_price ?? 0),
  }));
}

function normalizeSales(rows) {
  return rows.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
  }));
}

function normalizeStockMovements(rows) {
  return rows.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
  }));
}

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("dashboard-theme");
    if (savedTheme === "business" || savedTheme === "corporate") {
      return savedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "business"
      : "corporate";
  });
  const [activePage, setActivePage] = useState("dashboard");
  const [municipalities, setMunicipalities] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");

  const navigateTo = (page, options = {}) => {
    if (!VALID_PAGES.has(page)) return;
    setActivePage(page);
    const url = page === "dashboard" ? "#" : `#${page}`;
    if (options.replace) {
      window.history.replaceState({ page }, "", url);
    } else {
      window.history.pushState({ page }, "", url);
    }
  };

  const loadAllData = useCallback(async () => {
    setIsLoadingData(true);
    setLoadError("");
    try {
      const [m, s, p, saleRows, movements] = await Promise.all([
        apiRequest("/api/municipalities"),
        apiRequest("/api/suppliers"),
        apiRequest("/api/products"),
        apiRequest("/api/sales"),
        apiRequest("/api/stock-movements"),
      ]);

      setMunicipalities(Array.isArray(m) ? m : []);
      setSuppliers(Array.isArray(s) ? s : []);
      setProducts(normalizeProducts(Array.isArray(p) ? p : []));
      setSales(normalizeSales(Array.isArray(saleRows) ? saleRows : []));
      setStockMovements(
        normalizeStockMovements(Array.isArray(movements) ? movements : []),
      );
    } catch (error) {
      setLoadError(error.message || "Failed to load data from backend.");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const createMunicipality = async (payload) => {
    await apiRequest("/api/municipalities", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const updateMunicipality = async (id, payload) => {
    await apiRequest(`/api/municipalities/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const deleteMunicipality = async (id) => {
    await apiRequest(`/api/municipalities/${id}`, { method: "DELETE" });
    await loadAllData();
  };

  const createSupplier = async (payload) => {
    await apiRequest("/api/suppliers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const updateSupplier = async (id, payload) => {
    await apiRequest(`/api/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const deleteSupplier = async (id) => {
    await apiRequest(`/api/suppliers/${id}`, { method: "DELETE" });
    await loadAllData();
  };

  const createProduct = async (payload) => {
    await apiRequest("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const updateProduct = async (id, payload) => {
    await apiRequest(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const deleteProduct = async (id) => {
    await apiRequest(`/api/products/${id}`, { method: "DELETE" });
    await loadAllData();
  };

  const createSale = async (payload) => {
    await apiRequest("/api/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const updateSale = async (id, payload) => {
    await apiRequest(`/api/sales/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const deleteSale = async (id) => {
    await apiRequest(`/api/sales/${id}`, { method: "DELETE" });
    await loadAllData();
  };

  const createStockMovement = async (payload) => {
    await apiRequest("/api/stock-movements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const updateStockMovement = async (id, payload) => {
    await apiRequest(`/api/stock-movements/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const deleteStockMovement = async (id) => {
    await apiRequest(`/api/stock-movements/${id}`, { method: "DELETE" });
    await loadAllData();
  };

  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "");
    const initialPage = VALID_PAGES.has(fromHash) ? fromHash : "dashboard";
    setActivePage(initialPage);
    window.history.replaceState(
      { page: initialPage },
      "",
      initialPage === "dashboard" ? "#" : `#${initialPage}`,
    );

    const handlePopState = (event) => {
      const pageFromState = event.state?.page;
      if (VALID_PAGES.has(pageFromState)) {
        setActivePage(pageFromState);
        return;
      }
      const hashPage = window.location.hash.replace("#", "");
      setActivePage(VALID_PAGES.has(hashPage) ? hashPage : "dashboard");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("dashboard-theme", theme);
  }, [theme]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const renderPage = () => {
    if (activePage === "dashboard") {
      return (
        <DashboardPage
          municipalities={municipalities}
          suppliers={suppliers}
          products={products}
          sales={sales}
          stockMovements={stockMovements}
          onNavigate={navigateTo}
        />
      );
    }

    if (activePage === "municipalities") {
      return (
        <MunicipalitiesPage
          municipalities={municipalities}
          onCreateMunicipality={createMunicipality}
          onUpdateMunicipality={updateMunicipality}
          onDeleteMunicipality={deleteMunicipality}
        />
      );
    }

    if (activePage === "suppliers") {
      return (
        <SuppliersPage
          suppliers={suppliers}
          onCreateSupplier={createSupplier}
          onUpdateSupplier={updateSupplier}
          onDeleteSupplier={deleteSupplier}
        />
      );
    }

    if (activePage === "products") {
      return (
        <ProductsPage
          products={products}
          municipalities={municipalities}
          suppliers={suppliers}
          onCreateProduct={createProduct}
          onUpdateProduct={updateProduct}
          onDeleteProduct={deleteProduct}
        />
      );
    }

    if (activePage === "inventory") {
      return (
        <InventoryPage
          municipalities={municipalities}
          products={products}
          sales={sales}
          stockMovements={stockMovements}
        />
      );
    }

    if (activePage === "sales") {
      return (
        <SalesPage
          sales={sales}
          products={products}
          stockMovements={stockMovements}
          onCreateSale={createSale}
          onUpdateSale={updateSale}
          onDeleteSale={deleteSale}
        />
      );
    }

    if (activePage === "stock-movements") {
      return (
        <StockMovementsPage
          stockMovements={stockMovements}
          products={products}
          onCreateStockMovement={createStockMovement}
          onUpdateStockMovement={updateStockMovement}
          onDeleteStockMovement={deleteStockMovement}
        />
      );
    }

    if (activePage === "product-summary") {
      return <ProductSummaryPage />;
    }

    if (activePage === "sales-report") {
      return <SalesReportPage />;
    }

    return null;
  };

  const contentKey = isLoadingData ? "loading" : loadError ? "error" : activePage;

  return (
    <main className="relative min-h-screen overflow-hidden bg-base-200 text-base-content">
      <AnimatedGridBackground />
      <div className="drawer relative z-10 lg:drawer-open">
        <input id="app-drawer" type="checkbox" className="drawer-toggle" />

        <div className="drawer-content p-4 md:p-6 lg:p-8">
          <header className="navbar mb-6 rounded-box border border-base-300 bg-base-100 px-4 shadow-sm md:px-6">
            <div className="flex-1">
              <label
                htmlFor="app-drawer"
                className="btn btn-square btn-ghost mr-2 lg:hidden"
                aria-label="Open sidebar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="inline-block h-5 w-5 stroke-current"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  ></path>
                </svg>
              </label>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/60">
                  {activePage === "dashboard"
                    ? "Provincial Economic Development and Investment Promotion Office (PEDIPO)"
                    : "PEDIPO"}
                </p>
                <BlurReveal>
                  <h1 className="text-xl font-extrabold md:text-2xl">
                    {activePage === "dashboard"
                      ? "Dashboard"
                      : activePage === "municipalities"
                        ? "Master Data - Municipalities"
                        : activePage === "suppliers"
                          ? "Master Data - Suppliers"
                          : activePage === "products"
                            ? "Master Data - Products"
                            : activePage === "inventory"
                              ? "Inventory Management - Inventory"
                              : activePage === "sales"
                                ? "Inventory Management - Sales"
                                : activePage === "stock-movements"
                                  ? "Inventory Management - Stock Movements"
                                  : "Reports - Product Summary"}
                  </h1>
                </BlurReveal>
              </div>
            </div>
            {activePage === "dashboard" ? (
              <div className="flex-none">
                <label
                  className="swap swap-rotate btn btn-ghost btn-circle"
                  aria-label="Toggle theme"
                >
                  <input
                    type="checkbox"
                    checked={theme === "business"}
                    onChange={(event) =>
                      setTheme(event.target.checked ? "business" : "corporate")
                    }
                  />
                  <svg className="swap-off size-5 fill-current" viewBox="0 0 24 24">
                    <path d="M5.64 17.657A9 9 0 1012 3v2a7 7 0 117 7h2a9 9 0 00-15.36 5.657z" />
                  </svg>
                  <svg className="swap-on size-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20.742 13.045a8.088 8.088 0 01-9.787-9.787 1 1 0 00-1.247-1.247A10.088 10.088 0 1021.99 14.292a1 1 0 00-1.247-1.247z" />
                  </svg>
                </label>
              </div>
            ) : null}
          </header>

          <AnimatePresence mode="wait">
            <motion.section
              key={contentKey}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {isLoadingData ? (
                <section className="card border border-base-300 bg-base-100 shadow-sm">
                  <div className="card-body">
                    <span className="loading loading-spinner loading-md" />
                    <p className="text-sm text-base-content/70">Loading data from backend...</p>
                  </div>
                </section>
              ) : loadError ? (
                <section className="card border border-error/30 bg-base-100 shadow-sm">
                  <div className="card-body">
                    <h2 className="card-title text-error">Backend Connection Error</h2>
                    <p>{loadError}</p>
                    <div className="card-actions">
                      <button
                        type="button"
                        className="btn btn-error btn-outline"
                        onClick={loadAllData}
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                renderPage()
              )}
            </motion.section>
          </AnimatePresence>
        </div>

        <aside className="drawer-side z-20">
          <label htmlFor="app-drawer" className="drawer-overlay" />
          <div className="h-full w-72 border-r border-base-300 bg-base-100 p-4">
            <div className="mb-4 px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">
                <AnimatedShinyText>Navigation</AnimatedShinyText>
              </p>
            </div>
            <ul className="menu w-full gap-1 rounded-box">
              <li>
                <button
                  type="button"
                  className={activePage === "dashboard" ? "active font-semibold" : ""}
                  onClick={() => navigateTo("dashboard")}
                >
                  Dashboard
                </button>
              </li>
              <li>
                <details
                  open={
                    activePage === "municipalities" ||
                    activePage === "suppliers" ||
                    activePage === "products"
                  }
                >
                  <summary className="font-semibold">Master Data</summary>
                  <ul>
                    <li>
                      <button
                        type="button"
                        className={activePage === "municipalities" ? "active" : ""}
                        onClick={() => navigateTo("municipalities")}
                      >
                        Municipalities
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={activePage === "suppliers" ? "active" : ""}
                        onClick={() => navigateTo("suppliers")}
                      >
                        Suppliers
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={activePage === "products" ? "active" : ""}
                        onClick={() => navigateTo("products")}
                      >
                        Products
                      </button>
                    </li>
                  </ul>
                </details>
              </li>
              <li>
                <details
                  open={
                    activePage === "inventory" ||
                    activePage === "sales" ||
                    activePage === "stock-movements"
                  }
                >
                  <summary className="font-semibold">Inventory Management</summary>
                  <ul>
                    <li>
                      <button
                        type="button"
                        className={activePage === "inventory" ? "active" : ""}
                        onClick={() => navigateTo("inventory")}
                      >
                        Inventory
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={activePage === "sales" ? "active" : ""}
                        onClick={() => navigateTo("sales")}
                      >
                        Sales
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={activePage === "stock-movements" ? "active" : ""}
                        onClick={() => navigateTo("stock-movements")}
                      >
                        Stock Movements
                      </button>
                    </li>
                  </ul>
                </details>
              </li>
              <li>
                <details open={activePage === "product-summary" || activePage === "sales-report"}>
                  <summary className="font-semibold">Reports</summary>
                  <ul>
                    <li>
                      <button
                        type="button"
                        className={activePage === "product-summary" ? "active" : ""}
                        onClick={() => navigateTo("product-summary")}
                      >
                        Product Summary
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className={activePage === "sales-report" ? "active" : ""}
                        onClick={() => navigateTo("sales-report")}
                      >
                        Sales Report
                      </button>
                    </li>
                  </ul>
                </details>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default App;

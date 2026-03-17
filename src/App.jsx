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
import UsersPage from "./pages/users/UsersPage";
import SalesPage from "./pages/sales/SalesPage";
import StockMovementsPage from "./pages/stock-movements/StockMovementsPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import LoginPage from "./pages/auth/LoginPage";
import ActivityLogsPage from "./pages/activity-logs/ActivityLogsPage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:4000`;

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
  "users", // <-- Added users page
  "activity-logs",
]);

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  });

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
    }
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
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // List of all users from backend
  const [activityLogs, setActivityLogs] = useState([]);
  const [isInitializingAuth, setIsInitializingAuth] = useState(true);

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

  const fetchMunicipalities = useCallback(async () => {
    try {
      const data = await apiRequest("/api/municipalities");
      setMunicipalities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch municipalities:", err);
      setLoadError(err.message || "Failed to load municipalities.");
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await apiRequest("/api/suppliers");
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
      setLoadError(err.message || "Failed to load suppliers.");
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await apiRequest("/api/products");
      setProducts(normalizeProducts(Array.isArray(data) ? data : []));
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setLoadError(err.message || "Failed to load products.");
    }
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      const data = await apiRequest("/api/sales");
      setSales(normalizeSales(Array.isArray(data) ? data : []));
    } catch (err) {
      console.error("Failed to fetch sales:", err);
      setLoadError(err.message || "Failed to load sales.");
    }
  }, []);

  const fetchStockMovements = useCallback(async () => {
    try {
      const data = await apiRequest("/api/stock-movements");
      setStockMovements(normalizeStockMovements(Array.isArray(data) ? data : []));
    } catch (err) {
      console.error("Failed to fetch stock movements:", err);
      setLoadError(err.message || "Failed to load stock movements.");
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiRequest("/api/users");
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setLoadError(err.message || "Failed to load users.");
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    try {
      const data = await apiRequest("/api/audit-logs");
      setActivityLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch activity logs:", err);
      setLoadError(err.message || "Failed to load activity logs.");
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoadingData(true);
    setLoadError("");
    try {
      await Promise.all([
        fetchMunicipalities(),
        fetchSuppliers(),
        fetchProducts(),
        fetchSales(),
        fetchStockMovements(),
      ]);

      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (currentUser?.role === "admin") {
        await Promise.all([
          fetchUsers(),
          fetchActivityLogs(),
        ]);
      }
    } catch (error) {
      // Errors are already set by individual fetch functions
      // This catch block is mainly for unexpected errors during Promise.all
      if (!loadError) { // Only set if no specific error was set by a sub-fetch
        setLoadError(error.message || "Failed to load data from backend.");
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [fetchMunicipalities, fetchSuppliers, fetchProducts, fetchSales, fetchStockMovements, fetchUsers, fetchActivityLogs, loadError]);


  const createUserAccount = async (payload) => {
    await apiRequest("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const updateUserAccount = async (id, payload) => {
    await apiRequest(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    await loadAllData();
  };

  const deleteUserAccount = async (id) => {
    await apiRequest(`/api/users/${id}`, { method: "DELETE" });
    await loadAllData();
  };

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
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setIsInitializingAuth(false);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("dashboard-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [loadAllData, user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

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
          isAdmin={user?.role === "admin"}
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
          isAdmin={user?.role === "admin"}
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
          isAdmin={user?.role === "admin"}
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
          isAdmin={user?.role === "admin"}
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
          isAdmin={user?.role === "admin"}
        />
      );
    }

    if (activePage === "users") {
      if (user?.role !== "admin") {
        return (
          <section className="card border border-error/30 bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-error">Forbidden</h2>
              <p>You do not have permission to view this page.</p>
            </div>
          </section>
        );
      }
      return (
        <UsersPage
          users={allUsers}
          onCreateUser={createUserAccount}
          onUpdateUser={updateUserAccount}
          onDeleteUser={deleteUserAccount}
          currentUserId={user?.id}
        />
      );
    }

    if (activePage === "activity-logs") {
      if (user?.role !== "admin") {
        return (
          <section className="card border border-error/30 bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-error">Forbidden</h2>
              <p>You do not have permission to view this page.</p>
            </div>
          </section>
        );
      }
      return <ActivityLogsPage logs={activityLogs} />;
    }

    if (activePage === "product-summary") {
      return <ProductSummaryPage />;
    }

    if (activePage === "sales-report") {
      return <SalesReportPage />;
    }

    return null;
  };

  if (isInitializingAuth) {
    return <div className="min-h-screen bg-base-200" />;
  }

  if (!user) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-base-200 font-sans text-base-content">
        <AnimatedGridBackground />
        <div className="relative z-10">
          <LoginPage onLoginSuccess={setUser} />
        </div>
      </main>
    );
  }

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
                                  : activePage === "users"
                                    ? "Master Control - User Administration"
                                    : activePage === "activity-logs"
                                      ? "Master Control - Activity Logs"
                                      : activePage === "product-summary"
                                        ? "Reports - Product Summary"
                                        : "Reports - Sales Report"}
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
          <div className="flex h-full w-72 flex-col gap-2 border-r border-base-300 bg-base-100 p-4">
            <div className="shrink-0 px-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">
                <AnimatedShinyText>Navigation</AnimatedShinyText>
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
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

                {user?.role === "admin" && (
                  <li>
                    <details open={activePage === "users"}>
                      <summary className="font-semibold">Master Control</summary>
                      <ul>
                        <li>
                          <button
                            type="button"
                            className={activePage === "users" ? "active" : ""}
                            onClick={() => navigateTo("users")}
                          >
                            User Administration
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            className={activePage === "activity-logs" ? "active" : ""}
                            onClick={() => navigateTo("activity-logs")}
                          >
                            Activity Logs
                          </button>
                        </li>
                      </ul>
                    </details>
                  </li>
                )}

              </ul>
            </div>

            <div className="mt-auto shrink-0 border-t border-base-300 p-4 pb-0">
              <div className="mb-4 flex items-center px-4">
                <div className="avatar placeholder">
                  <div className="flex w-10 items-center justify-center rounded-full bg-primary text-primary-content">
                    <span className="text-lg font-bold">
                      {user?.username?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex flex-col">
                  <span className="text-sm font-bold leading-none">{user?.username}</span>
                  <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-base-content/50">
                    {user?.role || "Administrator"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost w-full justify-start text-error hover:bg-error/10 hover:text-error"
                onClick={handleLogout}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </aside>
      </div >
    </main >
  );
}

export default App;

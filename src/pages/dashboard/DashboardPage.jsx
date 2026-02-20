import { useMemo } from "react";
import { motion } from "framer-motion";
import NumberTicker from "../../components/magic/NumberTicker";
import MagicCard from "../../components/magic/MagicCard";
import ShimmerButton from "../../components/magic/ShimmerButton";
import Pulse from "../../components/magic/Pulse";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: "easeOut" } },
};

function DashboardPage({
  municipalities,
  suppliers,
  products,
  sales,
  stockMovements,
  onNavigate,
}) {
  const productNameById = useMemo(
    () => new Map(products.map((item) => [item.id, item.name])),
    [products],
  );

  const quantityByProduct = useMemo(() => {
    const map = new Map(products.map((item) => [item.id, 0]));

    for (const movement of stockMovements) {
      if (!map.has(movement.product_id)) continue;
      if (movement.movement_type === "IN") {
        map.set(movement.product_id, map.get(movement.product_id) + movement.quantity);
      } else if (movement.movement_type === "OUT") {
        map.set(movement.product_id, map.get(movement.product_id) - movement.quantity);
      }
    }

    for (const sale of sales) {
      if (!map.has(sale.product_id)) continue;
      map.set(sale.product_id, map.get(sale.product_id) - sale.quantity);
    }

    return map;
  }, [products, sales, stockMovements]);

  const stockSummary = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let negativeStock = 0;
    let totalStockUnits = 0;

    for (const quantity of quantityByProduct.values()) {
      totalStockUnits += quantity;
      if (quantity < 0) negativeStock += 1;
      if (quantity === 0) outOfStock += 1;
      if (quantity > 0 && quantity <= 5) lowStock += 1;
    }

    return { outOfStock, lowStock, negativeStock, totalStockUnits };
  }, [quantityByProduct]);

  const totalRevenue = useMemo(() => {
    return sales.reduce(
      (sum, sale) => sum + Number(sale.quantity) * Number(sale.unit_price),
      0,
    );
  }, [sales]);

  const salesToday = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    return sales.filter((item) => {
      const date = new Date(item.sale_date);
      return (
        date.getFullYear() === y && date.getMonth() === m && date.getDate() === d
      );
    }).length;
  }, [sales]);

  const recentSales = useMemo(
    () =>
      [...sales]
        .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))
        .slice(0, 5),
    [sales],
  );

  const recentMovements = useMemo(
    () =>
      [...stockMovements]
        .sort((a, b) => new Date(b.movement_date) - new Date(a.movement_date))
        .slice(0, 5),
    [stockMovements],
  );

  const lowStockItems = useMemo(
    () =>
      products
        .map((product) => ({
          id: product.id,
          name: product.name,
          quantity: quantityByProduct.get(product.id) ?? 0,
        }))
        .filter((item) => item.quantity <= 5)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 6),
    [products, quantityByProduct],
  );

  const alertCount = stockSummary.outOfStock + stockSummary.lowStock;

  return (
    <motion.section
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ── Stat cards ──────────────────────────────────────── */}
      <motion.section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        variants={fadeUp}
      >
        <MagicCard gradientFrom="#10b981" gradientTo="#3b82f6">
          <div className="p-5">
            <p className="text-sm text-base-content/70">Total Revenue</p>
            <p className="text-2xl font-bold">
              <NumberTicker value={totalRevenue} decimalPlaces={2} />
            </p>
            <p className="text-sm text-base-content/70">{sales.length} total sales records</p>
          </div>
        </MagicCard>

        <MagicCard gradientFrom="#8b5cf6" gradientTo="#ec4899">
          <div className="p-5">
            <p className="text-sm text-base-content/70">Sales Today</p>
            <p className="text-2xl font-bold">
              <NumberTicker value={salesToday} />
            </p>
            <p className="text-sm text-base-content/70">Based on local date/time</p>
          </div>
        </MagicCard>

        <MagicCard gradientFrom="#06b6d4" gradientTo="#8b5cf6">
          <div className="p-5">
            <p className="text-sm text-base-content/70">Total Stock Units</p>
            <p className="text-2xl font-bold">
              <NumberTicker value={stockSummary.totalStockUnits} />
            </p>
            <p className="text-sm text-base-content/70">{products.length} tracked products</p>
          </div>
        </MagicCard>

        <MagicCard gradientFrom="#f59e0b" gradientTo="#ef4444">
          <div className="p-5">
            <p className="text-sm text-base-content/70">Inventory Alerts</p>
            <p className="text-2xl font-bold">
              {alertCount > 0 ? (
                <Pulse color="#ef4444">
                  <NumberTicker value={alertCount} />
                </Pulse>
              ) : (
                <NumberTicker value={0} />
              )}
            </p>
            <p className="text-sm text-base-content/70">
              {stockSummary.outOfStock} out, {stockSummary.lowStock} low
            </p>
          </div>
        </MagicCard>
      </motion.section>

      {/* ── Master data + Stock health ──────────────────────── */}
      <motion.section className="grid gap-6 xl:grid-cols-3" variants={fadeUp}>
        <MagicCard className="xl:col-span-2" gradientFrom="#6366f1" gradientTo="#a855f7">
          <div className="card-body">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="card-title text-lg">Master Data Overview</h2>
              <span className="badge badge-outline rounded-full">Current Records</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-box border border-base-300 p-4">
                <p className="text-sm text-base-content/70">Municipalities</p>
                <p className="text-2xl font-bold">
                  <NumberTicker value={municipalities.length} />
                </p>
              </div>
              <div className="rounded-box border border-base-300 p-4">
                <p className="text-sm text-base-content/70">Suppliers</p>
                <p className="text-2xl font-bold">
                  <NumberTicker value={suppliers.length} />
                </p>
              </div>
              <div className="rounded-box border border-base-300 p-4">
                <p className="text-sm text-base-content/70">Products</p>
                <p className="text-2xl font-bold">
                  <NumberTicker value={products.length} />
                </p>
              </div>
            </div>

            <div className="divider my-2" />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ShimmerButton
                background="oklch(var(--p))"
                shimmerColor="rgba(255,255,255,0.6)"
                borderRadius="var(--rounded-btn, 0.5rem)"
                onClick={() => onNavigate("municipalities")}
              >
                Manage Municipalities
              </ShimmerButton>
              <ShimmerButton
                background="oklch(var(--p))"
                shimmerColor="rgba(255,255,255,0.6)"
                borderRadius="var(--rounded-btn, 0.5rem)"
                onClick={() => onNavigate("suppliers")}
              >
                Manage Suppliers
              </ShimmerButton>
              <ShimmerButton
                background="oklch(var(--p))"
                shimmerColor="rgba(255,255,255,0.6)"
                borderRadius="var(--rounded-btn, 0.5rem)"
                onClick={() => onNavigate("products")}
              >
                Manage Products
              </ShimmerButton>
              <ShimmerButton
                background="oklch(var(--s))"
                shimmerColor="rgba(255,255,255,0.5)"
                borderRadius="var(--rounded-btn, 0.5rem)"
                onClick={() => onNavigate("inventory")}
              >
                Open Inventory
              </ShimmerButton>
              <ShimmerButton
                background="oklch(var(--s))"
                shimmerColor="rgba(255,255,255,0.5)"
                borderRadius="var(--rounded-btn, 0.5rem)"
                onClick={() => onNavigate("sales")}
              >
                Record Sales
              </ShimmerButton>
              <ShimmerButton
                background="oklch(var(--s))"
                shimmerColor="rgba(255,255,255,0.5)"
                borderRadius="var(--rounded-btn, 0.5rem)"
                onClick={() => onNavigate("stock-movements")}
              >
                Record Stock Movement
              </ShimmerButton>
            </div>
          </div>
        </MagicCard>

        <MagicCard gradientFrom="#ef4444" gradientTo="#f59e0b">
          <div className="card-body">
            <h2 className="card-title text-lg">Stock Health</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-box border border-base-300 p-3">
                <span>Out of Stock</span>
                <Pulse color="#eab308">
                  <span className="badge badge-warning rounded-full">{stockSummary.outOfStock}</span>
                </Pulse>
              </div>
              <div className="flex items-center justify-between rounded-box border border-base-300 p-3">
                <span>Low Stock (1-5)</span>
                <span className="badge badge-info rounded-full">{stockSummary.lowStock}</span>
              </div>
              <div className="flex items-center justify-between rounded-box border border-base-300 p-3">
                <span>Negative Stock</span>
                {stockSummary.negativeStock > 0 ? (
                  <Pulse color="#ef4444">
                    <span className="badge badge-error rounded-full">{stockSummary.negativeStock}</span>
                  </Pulse>
                ) : (
                  <span className="badge badge-error rounded-full">{stockSummary.negativeStock}</span>
                )}
              </div>
            </div>
          </div>
        </MagicCard>
      </motion.section>

      {/* ── Recent Sales + Movements ───────────────────────── */}
      <motion.section className="grid gap-6 xl:grid-cols-2" variants={fadeUp}>
        <MagicCard gradientFrom="#3b82f6" gradientTo="#10b981">
          <div className="card-body">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="card-title text-lg">Recent Sales</h2>
              <button className="btn btn-xs btn-ghost" onClick={() => onNavigate("sales")}>
                View all
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.id}</td>
                      <td>{productNameById.get(sale.product_id) ?? `Product #${sale.product_id}`}</td>
                      <td>{sale.quantity}</td>
                      <td>{(sale.quantity * sale.unit_price).toFixed(2)}</td>
                    </tr>
                  ))}
                  {recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-base-content/70">
                        No sales records yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </MagicCard>

        <MagicCard gradientFrom="#a855f7" gradientTo="#06b6d4">
          <div className="card-body">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="card-title text-lg">Recent Stock Movements</h2>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => onNavigate("stock-movements")}
              >
                View all
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.id}</td>
                      <td>
                        {productNameById.get(movement.product_id) ??
                          `Product #${movement.product_id}`}
                      </td>
                      <td>{movement.movement_type}</td>
                      <td>{movement.quantity}</td>
                    </tr>
                  ))}
                  {recentMovements.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-base-content/70">
                        No stock movements yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </MagicCard>
      </motion.section>

      {/* ── Low Stock Watchlist ─────────────────────────────── */}
      <motion.section variants={fadeUp}>
        <MagicCard gradientFrom="#ec4899" gradientTo="#f97316">
          <div className="card-body">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="card-title text-lg">Low Stock Watchlist</h2>
              <button className="btn btn-xs btn-ghost" onClick={() => onNavigate("inventory")}>
                Open Inventory
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity On Hand</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>
                        <span
                          className={`badge rounded-full ${item.quantity < 0
                              ? "badge-error"
                              : item.quantity === 0
                                ? "badge-warning"
                                : "badge-info"
                            }`}
                        >
                          {item.quantity < 0
                            ? "Negative"
                            : item.quantity === 0
                              ? "Out of Stock"
                              : "Low Stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center text-base-content/70">
                        No low-stock products.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </MagicCard>
      </motion.section>
    </motion.section>
  );
}

export default DashboardPage;

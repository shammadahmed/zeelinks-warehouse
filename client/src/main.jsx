import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Box,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LayoutGrid,
  List,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import "./styles.css";

import { api, formatDate, formatTime } from "./lib.js";
import AssetForm from "./components/AssetForm.jsx";
import DeleteAsset from "./components/DeleteAsset.jsx";
import AssetDetail from "./components/AssetDetail.jsx";
import "@fontsource-variable/dm-sans";

function App() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("grid");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [modal, setModal] = useState(null);
  const [actionAsset, setActionAsset] = useState(null);
  const [toast, setToast] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      q: query,
      category,
      sort,
      page,
      limit: 12,
    });
    api(`/api/assets?${params}`, { signal: controller.signal })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [query, category, sort, page, refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const reset = () => {
    setSearch("");
    setQuery("");
    setCategory("");
    setPage(1);
  };
  const saved = (asset) => {
    setModal(null);
    reset();
    setSort("newest");
    setRefresh((v) => v + 1);
    setToast(`${asset.assetId} has been registered.`);
  };
  const edited = (asset) => {
    reset();
    setModal(asset.id);
    setRefresh((v) => v + 1);
    setToast(`${asset.assetId} has been updated.`);
  };
  const deleted = (asset) => {
    setModal(null);
    reset();
    setRefresh((v) => v + 1);
    setToast(`${asset.assetId} has been deleted.`);
  };
  const openAction = (action, asset) => {
    setActionAsset(asset);
    setModal(action);
  };
  const assets = data?.items || [];
  const stats = data?.stats;
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-content">
          <a href="/" className="brand" aria-label="Zee Links home">
            <img
              src="https://zeelinks.com.pk/assets/logo/logo.png"
              alt="Zee Links"
            />
            <span className="brand-text">
              <span className="brand-name">Zee links</span>
              <span className="brand-subtitle">Warehouse</span>
            </span>
          </a>
          <button
            className="primary-button add-button"
            onClick={() => setModal("add")}
          >
            <Plus size={18} /> Add asset
          </button>
        </div>
      </header>
      <div className="main-shell">
        <main>
          <section className="stats" aria-label="Register summary">
            <article className="stat-card">
              <span>Total assets</span>
              <strong>{stats?.totalAssets ?? "—"}</strong>
            </article>
            <article className="stat-card">
              <span>Categories</span>
              <strong>{stats?.totalCategories ?? "—"}</strong>
            </article>
            <article className="stat-card">
              <span>
                Added today <small>(UTC)</small>
              </span>
              <strong>{stats?.addedToday ?? "—"}</strong>
            </article>
          </section>
          <section
            className="inventory-section"
            aria-labelledby="inventory-title"
          >
            <div className="section-heading">
              <div>
                <h2 id="inventory-title">
                  All assets <span>{data?.total ?? "—"}</span>
                </h2>
              </div>
              <div className="view-switch" aria-label="Display mode">
                <button
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  className={view === "grid" ? "selected" : ""}
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid size={17} />
                </button>
                <button
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  className={view === "list" ? "selected" : ""}
                  onClick={() => setView("list")}
                >
                  <List size={19} />
                </button>
              </div>
            </div>
            <div className="toolbar">
              <div className="search-input">
                <Search size={18} />
                <input
                  aria-label="Search by Asset ID"
                  placeholder="Search by Asset ID…"
                  value={search}
                  maxLength={80}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="icon-button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="filter-controls">
                <div className="select-wrap">
                  <select
                    aria-label="Filter by category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All categories</option>
                    {data?.categories.map((c) => (
                      <option key={c.category} value={c.category}>
                        {c.category} ({c.count})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </div>
                <div className="select-wrap sort-select">
                  <ArrowDown size={15} />
                  <select
                    aria-label="Sort assets"
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                  <ChevronDown size={15} />
                </div>
              </div>
            </div>
            {(query || category) && (
              <div className="filter-summary">
                <span>
                  Results {query && <>for “{query}”</>}{" "}
                  {category && <>in {category}</>}
                </span>
                <button onClick={reset}>
                  Clear filters <X size={13} />
                </button>
              </div>
            )}
            <div aria-live="polite" aria-busy={loading}>
              {error ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    <ShieldCheck size={28} />
                  </span>
                  <h3>We couldn’t reach the register</h3>
                  <p>
                    {error === "Failed to fetch"
                      ? "Check your network connection and make sure the server is running."
                      : error}
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() => setRefresh((v) => v + 1)}
                  >
                    Try again
                  </button>
                </div>
              ) : loading ? (
                <div className="asset-grid skeleton-grid">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div className="skeleton-card" key={i}>
                      <div />
                      <span />
                      <span />
                    </div>
                  ))}
                  <span className="sr-only">Loading assets</span>
                </div>
              ) : assets.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    <Box size={32} strokeWidth={1.5} />
                  </span>
                  <h3>
                    {query || category
                      ? "No matching assets"
                      : "No assets registered"}
                  </h3>
                  <p>
                    {query || category
                      ? "Try another Asset ID or clear your filters to see all records."
                      : "Add an Asset ID, category, and photograph to create a record."}
                  </p>
                  <button
                    className={
                      query || category ? "secondary-button" : "primary-button"
                    }
                    onClick={query || category ? reset : () => setModal("add")}
                  >
                    {query || category ? (
                      "Clear filters"
                    ) : (
                      <>
                        <Plus size={17} /> Add asset
                      </>
                    )}
                  </button>
                </div>
              ) : view === "grid" ? (
                <div className="asset-grid">
                  {assets.map((asset) => (
                    <button
                      className="asset-card"
                      key={asset.id}
                      onClick={() => setModal(asset.id)}
                      aria-label={`View ${asset.assetId}`}
                    >
                      <div className="card-photo">
                        <img
                          src={asset.photoUrl}
                          alt={asset.assetId}
                          loading="lazy"
                        />
                        <span className="photo-category">{asset.category}</span>
                        <span className="card-open">
                          <ArrowUpRight size={18} />
                        </span>
                      </div>
                      <div className="card-body">
                        <div className="card-title">
                          <h3>{asset.assetId}</h3>
                        </div>
                        <div className="card-date">
                          <Clock3 size={13} />
                          <span>{formatDate(asset.createdAt)}</span>
                          <span className="date-divider">·</span>
                          <span>{formatTime(asset.createdAt)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Category</th>
                        <th>Date registered</th>
                        <th>Source</th>
                        <th>
                          <span className="sr-only">View record</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => (
                        <tr key={asset.id}>
                          <td>
                            <button
                              className="table-asset"
                              onClick={() => setModal(asset.id)}
                            >
                              <img src={asset.photoUrl} alt="" />
                              <strong>{asset.assetId}</strong>
                            </button>
                          </td>
                          <td>
                            <span className="category-badge">
                              {asset.category}
                            </span>
                          </td>
                          <td>
                            {formatDate(asset.createdAt)}
                            <small>{formatTime(asset.createdAt)}</small>
                          </td>
                          <td>
                            {asset.source === "automated"
                              ? "Automated"
                              : "Manual"}
                          </td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={`View ${asset.assetId}`}
                              onClick={() => setModal(asset.id)}
                            >
                              <ArrowUpRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {data && !error && !loading && data.total > 0 && (
              <footer className="inventory-footer">
                <span>
                  Showing{" "}
                  <strong>
                    {(page - 1) * data.limit + 1}–
                    {Math.min(page * data.limit, data.total)}
                  </strong>{" "}
                  of <strong>{data.total}</strong> assets
                </span>
                <div className="pagination">
                  <button
                    className="icon-button"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <span>
                    Page {page} of {data.totalPages}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Next page"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </footer>
            )}
          </section>
          <footer className="page-footer">Zee Links · Asset Management</footer>
        </main>
      </div>
      {modal === "add" && (
        <AssetForm
          categories={data?.categories.map((c) => c.category) || []}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal === "edit" && (
        <AssetForm
          asset={actionAsset}
          categories={data?.categories.map((c) => c.category) || []}
          onClose={() => setModal(actionAsset.id)}
          onSaved={edited}
        />
      )}
      {modal === "delete" && (
        <DeleteAsset
          asset={actionAsset}
          onCancel={() => setModal(actionAsset.id)}
          onDeleted={deleted}
        />
      )}
      {typeof modal === "number" && (
        <AssetDetail
          id={modal}
          onClose={() => setModal(null)}
          onEdit={(asset) => openAction("edit", asset)}
          onDelete={(asset) => openAction("delete", asset)}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

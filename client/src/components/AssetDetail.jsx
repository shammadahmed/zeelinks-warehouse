import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, CheckCircle2, Loader2 } from "lucide-react";
import Modal from "./Modal.jsx";
import { api, formatDate, formatTime, timezone } from "../lib.js";

export default function AssetDetail({ id, onClose }) {
  const [asset, setAsset] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    api(`/api/assets/${id}`, { signal: controller.signal })
      .then(setAsset)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [id, retry]);
  return (
    <Modal
      title={asset?.assetId || "Asset details"}
      subtitle="Registration details and photograph."
      onClose={onClose}
      className="detail-modal"
    >
      {error ? (
        <div className="detail-content">
          <div className="error-message" role="alert">
            {error}
          </div>
          <button
            className="secondary-button"
            onClick={() => setRetry((v) => v + 1)}
          >
            Try again
          </button>
        </div>
      ) : !asset ? (
        <div className="loading-state">
          <Loader2 className="spin" /> Loading asset…
        </div>
      ) : (
        <>
          <div className="detail-photo">
            <img src={asset.photoUrl} alt={`Photograph of ${asset.assetId}`} />
          </div>
          <div className="detail-content">
            <div className="detail-heading">
              <span className="category-badge">{asset.category}</span>
              <span className="recorded-label">
                <CheckCircle2 size={15} /> Recorded
              </span>
            </div>
            <dl>
              <div>
                <dt>Asset identification</dt>
                <dd className="mono">{asset.assetId}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{asset.category}</dd>
              </div>
              <div>
                <dt>Date registered</dt>
                <dd>{formatDate(asset.createdAt)}</dd>
              </div>
              <div>
                <dt>Time registered</dt>
                <dd>{formatTime(asset.createdAt)}</dd>
              </div>
              <div>
                <dt>Entry source</dt>
                <dd>
                  {asset.source === "automated"
                    ? "Automated system"
                    : "Manual entry"}
                </dd>
              </div>
              <div>
                <dt>Record number</dt>
                <dd>#{String(asset.id).padStart(4, "0")}</dd>
              </div>
            </dl>
            <p className="detail-timezone">
              Times shown in {timezone}.<br />
              Server timestamp: <span className="mono">{asset.createdAt}</span>
            </p>
          </div>
          <footer className="modal-footer">
            <a
              className="secondary-button"
              href={asset.photoUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open photograph <ArrowUpRight size={16} />
            </a>
            <button className="primary-button" onClick={onClose}>
              Done <Check size={17} />
            </button>
          </footer>
        </>
      )}
    </Modal>
  );
}

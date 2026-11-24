import React, { useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import Modal from "./Modal.jsx";
import { api } from "../lib.js";

export default function DeleteAsset({ asset, onCancel, onDeleted }) {
  const cancel = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await api(`/api/assets/${asset.id}`, { method: "DELETE" });
      onDeleted(asset);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Delete asset?"
      onClose={onCancel}
      busy={busy}
      initialFocusRef={cancel}
      className="delete-modal"
    >
      <div className="delete-content">
        <p>
          Delete <strong>{asset.assetId}</strong> from the warehouse?
        </p>
        <p>
          This permanently removes the record and its photograph. This action
          cannot be undone.
        </p>
      </div>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <footer className="modal-footer">
        <button
          ref={cancel}
          className="secondary-button"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button className="danger-button" disabled={busy} onClick={remove}>
          {busy ? <Loader2 className="spin" size={17} /> : <Trash2 size={17} />}
          {busy ? "Deleting…" : "Delete asset"}
        </button>
      </footer>
    </Modal>
  );
}

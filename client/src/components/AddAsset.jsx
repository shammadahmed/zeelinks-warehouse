import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  ImagePlus,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import Modal from "./Modal.jsx";
import { api } from "../lib.js";

const DEFAULT_CATEGORIES = [
  "Equipment",
  "Electronics",
  "Furniture",
  "Tools",
  "Vehicles",
  "Other",
];

export default function AddAsset({ categories, onClose, onSaved }) {
  const [assetId, setAssetId] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);
  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const choose = (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP photograph.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Photograph must be 8 MB or smaller.");
      return;
    }
    setError("");
    setPhoto(file);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!photo) {
      setError("Add a photograph before saving this asset.");
      return;
    }
    const form = new FormData();
    form.append("assetId", assetId.trim());
    form.append(
      "category",
      category === "__custom" ? customCategory.trim() : category,
    );
    form.append("photo", photo);
    setBusy(true);
    setError("");
    try {
      const asset = await api("/api/assets", { method: "POST", body: form });
      onSaved(asset);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Register an asset"
      subtitle="Enter the asset details and upload a photograph."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit} className="asset-form">
        <fieldset disabled={busy}>
          <div className="form-row">
            <label>
              Asset ID <span>*</span>
              <input
                autoComplete="off"
                required
                maxLength={80}
                pattern={String.raw`[A-Za-z0-9][A-Za-z0-9 ._\/\-]*`}
                title="Start with a letter or number. Letters, numbers, spaces, dots, underscores, slashes, and dashes are allowed."
                placeholder="e.g. WH-0042"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
              />
              <small>The unique identification number on your asset.</small>
            </label>
            <label>
              Category <span>*</span>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {[...new Set([...DEFAULT_CATEGORIES, ...categories])]
                  .sort()
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                <option value="__custom">Add a new category…</option>
              </select>
            </label>
          </div>
          {category === "__custom" && (
            <label className="custom-category">
              New category <span>*</span>
              <input
                required
                maxLength={60}
                placeholder="e.g. Safety equipment"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </label>
          )}
          <label className="photo-label">
            Asset photograph <span>*</span>
          </label>
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            ref={input}
            aria-label="Upload asset photograph"
            onChange={(e) => {
              choose(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className={`upload-zone ${dragging ? "dragging" : ""} ${photo ? "has-photo" : ""}`}
            onClick={() => input.current.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              choose(e.dataTransfer.files[0]);
            }}
          >
            {preview ? (
              <>
                <img src={preview} alt="Selected asset preview" />
                <span className="replace-photo">
                  <ImagePlus size={17} /> Change photograph
                </span>
              </>
            ) : (
              <>
                <span className="upload-icon">
                  <Upload size={25} />
                </span>
                <strong>Click to upload or drag and drop</strong>
                <span>JPG, PNG or WebP · up to 8 MB</span>
                <small>You can also choose a photo from your phone.</small>
              </>
            )}
          </button>
          {photo && (
            <div className="file-info">
              <CheckCircle2 size={16} />
              <span>{photo.name}</span>
              <small>{(photo.size / 1024 / 1024).toFixed(2)} MB</small>
              <button
                type="button"
                className="icon-button"
                aria-label="Remove photograph"
                onClick={() => setPhoto(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="timestamp-note">
            <Clock3 size={18} />
            <div>
              <strong>Date and time are recorded automatically</strong>
              <p>The server timestamps your record when you save it.</p>
            </div>
          </div>
        </fieldset>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <footer className="modal-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="primary-button" disabled={busy}>
            {busy ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
            {busy ? "Saving asset…" : "Save asset"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

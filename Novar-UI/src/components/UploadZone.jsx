import { useRef, useState, useCallback } from "react";
import styles from "./UploadZone.module.css";

function isValidFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  return ["pdf", "epub", "txt", "docx"].includes(ext);
}

export function UploadZone({ onFiles, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList) => {
      const valid = Array.from(fileList).filter(isValidFile);
      if (valid.length) onFiles(valid);
    },
    [onFiles],
  );

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };
  const onClick = () => !disabled && inputRef.current?.click();
  const onChange = (e) => handleFiles(e.target.files);

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ""} ${disabled ? styles.disabled : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label="Upload documents"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.epub,.txt,.docx"
        multiple
        onChange={onChange}
        className={styles.hidden}
        tabIndex={-1}
      />
      <span className={styles.icon}>+</span>
      <span className={styles.label}>drop files or click to browse</span>
      <span className={styles.hint}>pdf epub txt docx</span>
    </div>
  );
}

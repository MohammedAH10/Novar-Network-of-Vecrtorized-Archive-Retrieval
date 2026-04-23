// ChatInput.jsx — unchanged logic, only visual via CSS
import { useState, useRef } from "react";
import styles from "./ChatInput.module.css";

export function ChatInput({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onInput = (e) => {
    setValue(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  return (
    <div className={`${styles.wrapper} ${disabled ? styles.disabled : ""}`}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? "ask a question..."}
        disabled={disabled}
        rows={1}
        aria-label="Message input"
      />
      <button
        className={styles.send}
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send"
      >
        send
      </button>
    </div>
  );
}

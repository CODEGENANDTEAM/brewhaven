// A message box for errors and tips.
// message is { text, type } where type is "info", "success" or "error".
// An empty text hides the box. aria-live makes screen readers announce it.

const TAGS = { info: "Note", success: "Done", error: "Error" };

export default function Message({ message, onClose }) {
  const text = message && message.text;
  const type = (message && message.type) || "info";
  return (
    <div className={text ? `message message-${type}` : "message"} role="status" aria-live="polite" hidden={!text}>
      {text && <span className="message-tag">{TAGS[type] || "Note"}</span>}
      <span>{text}</span>
      {text && onClose && (
        <button type="button" className="icon-button" onClick={onClose} aria-label="Dismiss message">
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}

import { useState } from "react";
import { helloGreet } from "../bindings";

/**
 * The plugin's landing page. Round-trips the `hello_greet` command across the
 * Tauri IPC boundary, proving the full ACL chain at runtime, and renders the
 * returned message with explicit loading and error states.
 */
export default function HelloPage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function greet() {
    setLoading(true);
    setError(null);
    try {
      const result = await helloGreet({ name });
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Hello plugin</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Enter a name and greet it. The greeting is computed in Rust and returned across the Tauri IPC boundary.
      </p>

      <form
        className="mt-6 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="world"
          aria-label="Name to greet"
          className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "Greeting…" : "Greet"}
        </button>
      </form>

      {message && (
        <p className="mt-6 rounded-md border border-border bg-card px-4 py-3 text-card-foreground">{message}</p>
      )}
      {error && (
        <p className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

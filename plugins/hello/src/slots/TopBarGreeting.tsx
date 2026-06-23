import { Hand } from "lucide-react";
import { useNavigate } from "react-router";

/**
 * A `topbar.right` slot contribution. Slots are rendered eagerly (not lazy), so
 * this is a plain import rather than a `lazy()` route. It demonstrates a plugin
 * injecting an action into the frame shell's chrome.
 */
export default function TopBarGreeting() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-label="Open Hello"
      title="Open Hello"
      onClick={() => navigate("/hello")}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Hand size={18} />
    </button>
  );
}

import { Link } from "react-router";

/** A second route, demonstrating multi-page navigation and breadcrumbs within one plugin. */
export default function HelloSettings() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Hello settings</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        A placeholder settings page for the hello plugin. Use the breadcrumb or the link below to navigate back,
        then try the browser-style back/forward buttons in the top bar.
      </p>
      <Link to="/hello" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
        Back to Hello
      </Link>
    </div>
  );
}

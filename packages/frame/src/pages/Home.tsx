/** Default landing page contributed by the built-in `framePlugin`. */
export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Welcome to picoframe</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        This is the default home page. Add plugins to your app's plugin list to populate the sidebar and routes.
      </p>
    </div>
  );
}

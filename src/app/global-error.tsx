"use client"; // Error boundaries must be Client Components.

// Last-resort page when the root layout itself fails. It renders its own
// document, without the site's styles, so it is styled inline.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8f6f2",
          color: "#1a1a1a",
          textAlign: "center",
        }}
      >
        <title>Something went wrong | Atelier Store</title>
        <main>
          <h1 style={{ fontWeight: 400 }}>Something went wrong</h1>
          <p style={{ color: "#6b6b6b" }}>Please try again in a moment.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 16, padding: "12px 28px", border: "1px solid #1a1a1a", background: "#1a1a1a", color: "#fff", cursor: "pointer" }}
          >
            Try Again
          </button>
        </main>
      </body>
    </html>
  );
}

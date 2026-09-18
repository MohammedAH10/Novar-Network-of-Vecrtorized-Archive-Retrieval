import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[Novar UI] Unhandled error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0b0d1a",
            color: "#f6f3f2",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
            <h1 style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 400 }}>Something went sideways</h1>
            <p style={{ color: "#898696", fontSize: 14 }}>
              Reload the page to keep chatting with your library.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 12,
                padding: "10px 16px",
                borderRadius: 9,
                border: 0,
                background: "#fa806d",
                color: "#25111a",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
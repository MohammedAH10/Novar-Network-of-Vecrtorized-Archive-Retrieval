import { Link } from "react-router-dom";
import styles from "./Landing.module.css";

export default function Landing() {
  return (
    <div className={styles.landingContainer}>
      {/* starfield backgrounds – static elements */}
      <div className="star-bg"></div>
      <div className="stars"></div>
      <div className="stars-large"></div>
      <div className="shooting-star"></div>
      <div className="shooting-star"></div>
      <div className="shooting-star"></div>
      <div className="fluid-blob fluid-blob-1"></div>
      <div className="fluid-blob fluid-blob-2"></div>

      <main className={styles.hero}>
        <div className={styles.glassCard}>
          <h1 className={styles.title}>
            <span className={styles.gradientText}>NOVAAR</span>
          </h1>
          <p className={styles.tagline}>
            Network Of Vectorized Archive Retrieval
          </p>
          <p className={styles.description}>
            Neural retrieval over your documents. <br />
            Upload, index, and converse with AI‑powered semantic search.
          </p>
          <Link to="/app" className={styles.launchBtn}>
            Launch Interface →
          </Link>
          <div className={styles.features}>
            <span>⚡ real‑time streaming</span>
            <span>📄 PDF · EPUB · TXT · DOCX</span>
            <span>🧠 vector memory</span>
          </div>
        </div>
      </main>
    </div>
  );
}

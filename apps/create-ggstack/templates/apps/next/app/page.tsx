export default function HomePage() {
  return (
    <div className="gg-start">
      <header className="gg-header">
        <a
          className="gg-brand"
          href="https://github.com/gg-open-source/ggstack"
          aria-label="GGStack home"
        >
          <span className="gg-brand-icon" aria-hidden="true">
            gg
          </span>
          ggstack<span className="gg-brand-dot">.</span>
        </a>
        <span className="gg-framework">Next.js</span>
      </header>
      <main className="gg-main">
        <div className="gg-hero">
          <div className="gg-intro">
            <p className="gg-eyebrow">
              <span className="gg-status" aria-hidden="true"></span> YOUR NEXT
              CHAPTER STARTS HERE
            </p>
            <h1>
              Good foundations.
              <br />
              <span>Great possibilities.</span>
            </h1>
            <p className="gg-description">
              A little less setup. A lot more building.
              <br />
              Your <strong>{"{{APP_NAME}}"}</strong> app is ready for whatever
              comes next.
            </p>
            <a
              className="gg-primary"
              href="https://github.com/gg-open-source/ggstack/blob/main/apps/docs/guide/getting-started.md"
            >
              Start building <span aria-hidden="true">↗</span>
            </a>
            <a
              className="gg-source"
              href="https://github.com/gg-open-source/ggstack"
            >
              View on GitHub <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="gg-art" aria-hidden="true">
            <div className="gg-orbit gg-orbit-one"></div>
            <div className="gg-orbit gg-orbit-two"></div>
            <div className="gg-layer gg-layer-bottom"></div>
            <div className="gg-layer gg-layer-middle"></div>
            <div className="gg-layer gg-layer-top">
              <span>gg.</span>
            </div>
            <span className="gg-art-label">MAKE SOMETHING GREAT</span>
            <span className="gg-spark gg-spark-one">+</span>
            <span className="gg-spark gg-spark-two">+</span>
          </div>
        </div>
        <div className="gg-section-label">
          <span>FROM STARTER TO SOMETHING SPECIAL</span>
          <span>01 — 03</span>
        </div>
        <section className="gg-cards" aria-label="Getting started">
          <div className="gg-card">
            <span className="gg-card-number">01 / MAKE IT YOURS</span>
            <h2>Your code. Your canvas.</h2>
            <p>
              Open <code>app/page.tsx</code> and make your first edit. This is
              where your idea takes shape.
            </p>
            <span className="gg-card-note">
              <span className="gg-status" aria-hidden="true"></span> Ready when
              you are
            </span>
          </div>
          <a className="gg-card gg-card-link" href="https://nextjs.org/docs">
            <span className="gg-card-number">
              02 / FIND YOUR FLOW <span aria-hidden="true">↗</span>
            </span>
            <h2>Meet your framework.</h2>
            <p>
              Explore the Next.js docs. All the building blocks to turn your
              next idea into a real thing.
            </p>
            <span className="gg-card-note">
              Explore Next.js <span aria-hidden="true">→</span>
            </span>
          </a>
          <a
            className="gg-card gg-card-link"
            href="https://github.com/gg-open-source/ggstack/blob/main/apps/docs/guide/cli.md"
          >
            <span className="gg-card-number">
              03 / GROW YOUR STACK <span aria-hidden="true">↗</span>
            </span>
            <h2>Room for what’s next.</h2>
            <p>
              More apps, your favorite tools, one workspace. Build a stack that
              grows with your ambition.
            </p>
            <span className="gg-card-note">
              Explore GGStack <span aria-hidden="true">→</span>
            </span>
          </a>
        </section>
      </main>
      <footer className="gg-footer">
        <span>A good start changes everything.</span>
        <span>
          BUILT WITH{" "}
          <a href="https://github.com/gg-open-source/ggstack">
            GGSTACK <span aria-hidden="true">↗</span>
          </a>
        </span>
      </footer>
    </div>
  );
}

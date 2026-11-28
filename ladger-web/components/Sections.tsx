import { FAQ, FEATURES } from "@/lib/features";
import { APP_NAME, SHA256 } from "@/lib/config";
import { DownloadButton } from "./DownloadButton";
import { Icon } from "./Icon";

export function Features() {
  return (
    <section id="features">
      <div className="wrap">
        <h2>Everything you need to manage money</h2>
        <p className="sub">Built for monthly planning, not just a list of expenses.</p>
        <ul className="grid">
          {FEATURES.map((f) => (
            <li className="card" key={f.title}>
              <span className="ico"><Icon d={f.icon} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Steps() {
  return (
    <section className="alt">
      <div className="wrap">
        <h2>Up and running in three steps</h2>
        <p className="sub">It takes about a minute.</p>
        <ol className="steps">
          <li><h3>Sign in with your email</h3><p>Enter your email and the 6-digit code we send you.</p></li>
          <li><h3>Enter your monthly income</h3><p>{APP_NAME} builds a standard plan for rent, food, travel, bills and savings. Change any line you like.</p></li>
          <li><h3>Log as you spend</h3><p>Add entries with the + button and see planned against actual for the month.</p></li>
        </ol>
      </div>
    </section>
  );
}

export function Install() {
  return (
    <section id="install">
      <div className="wrap">
        <h2>How to install the APK</h2>
        <p className="sub">{APP_NAME} is installed from a file, so Android asks for permission once.</p>
        <div className="install">
          <ol className="steps" style={{ gridTemplateColumns: "1fr" }}>
            <li><h3>Download</h3><p>Tap Download for Android. If Chrome warns that the file may be harmful, choose Download anyway.</p></li>
            <li><h3>Allow installs from this browser</h3><p>When asked, open Settings and turn on Allow from this source for your browser or file manager.</p></li>
            <li><h3>Open the file and tap Install</h3><p>Open the downloaded file from your notifications or Downloads folder, then tap Install and Open.</p></li>
          </ol>
          <div>
            {FAQ.map((f) => (
              <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
            {SHA256 && (
              <details><summary>Checksum (SHA-256)</summary><p><code>{SHA256}</code></p></details>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section>
      <div className="wrap">
        <div className="dl">
          <h2>Ready to take control of your money?</h2>
          <p>Download {APP_NAME} and build your first monthly plan in a minute.</p>
          <DownloadButton label="Download for Android (APK)" withIcon={false} />
        </div>
      </div>
    </section>
  );
}

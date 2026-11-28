import Image from "next/image";
import { APP_NAME, MIN_ANDROID, VERSION } from "@/lib/config";
import { DownloadButton } from "./DownloadButton";
import { PhoneMock } from "./PhoneMock";

export function Header() {
  return (
    <header className="top">
      <div className="wrap">
        <nav aria-label="Main">
          <a className="brand" href="#top">
            <Image src="/icon-192.png" alt="" width={36} height={36} priority />
            {APP_NAME}
          </a>
          <span>
            <a className="link" href="#features">Features</a>
            <a className="link" href="#install">How to install</a>
          </span>
        </nav>
        <div className="hero" id="top">
          <div>
            <h1>Know where your <em>money</em> goes.</h1>
            <p className="lead">{APP_NAME} is a simple expense, income and savings tracker. Plan each month, log what you actually spend, and watch your balance grow.</p>
            <div className="cta">
              <DownloadButton />
              <a className="btn ghost" href="#features">See what is inside</a>
            </div>
            <ul className="meta">
              <li>Version {VERSION}</li>
              <li>Android {MIN_ANDROID} or newer</li>
              <li>Free</li>
              <li>No ads</li>
            </ul>
          </div>
          <PhoneMock />
        </div>
      </div>
    </header>
  );
}

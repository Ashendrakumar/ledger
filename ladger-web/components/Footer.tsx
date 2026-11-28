import { APP_NAME, DEVELOPER, VERSION } from "@/lib/config";

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        © {new Date().getFullYear()} {APP_NAME}. Android is a trademark of Google LLC. Version {VERSION}.<br />
        Developed by {DEVELOPER}
      </div>
    </footer>
  );
}

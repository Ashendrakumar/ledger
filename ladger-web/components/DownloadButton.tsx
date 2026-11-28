import { APK_FILENAME, APK_URL } from "@/lib/config";

export function DownloadButton({ label = "Download for Android (APK)", withIcon = true }: { label?: string; withIcon?: boolean }) {
  return (
    // The download attribute makes the browser save the file as Ladger.apk
    <a className="btn main" href={APK_URL} download={APK_FILENAME}>
      {withIcon && (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12M6 11l6 6 6-6M4 21h16" />
        </svg>
      )}
      {label}
    </a>
  );
}

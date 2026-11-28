export type Feature = { title: string; icon: string; text: string };

export const FEATURES: Feature[] = [
  { title: "Plan and actual, side by side", icon: "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4", text: "Plan each month, log what you really spend, and see the difference in rupees and percent, in red or green." },
  { title: "Balance that carries forward", icon: "M3 17l6-6 4 4 8-8M15 7h6v6", text: "Each month shows only its own entries. Only the balance carries over from earlier months." },
  { title: "Standard plan from your salary", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M9.5 10.5h4a1.5 1.5 0 0 1 0 3h-3", text: "Tell it your income once. It suggests rent, food, travel, bills and savings for you, and you can adjust every line." },
  { title: "Loans and EMI tracking", icon: "M3 7h18v12H3zM3 11h18M7 15h4", text: "Reducing or flat interest, a full schedule, prepayments, and one tap to mark an EMI as paid." },
  { title: "Goals you can edit", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", text: "Set a target, add any amount at any time, edit it or remove it when plans change." },
  { title: "Category breakdown", icon: "M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1zM21.21 15.89A10 10 0 1 1 8 2.83", text: "Tap any total to see planned and actual for every category, with trends over the last six months." },
  { title: "Private by default", icon: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z", text: "Lock the app with your fingerprint or face. Export your data to CSV whenever you like." },
  { title: "Sign in with email only", icon: "M3 5h18v14H3zM3 8l9 6 9-6", text: "A 6-digit code to your email. No password to remember." },
];

export const FAQ = [
  { q: "Is it safe to install?", a: "Only install the APK from this page. Compare the file with the checksum if one is listed." },
  { q: "Which Android versions work?", a: "Android 8.0 and newer. Phones and tablets." },
  { q: "Does it work offline?", a: "Yes. Your entries are kept on your phone, and sync when you are online and signed in." },
  { q: "How do I update?", a: "Download the new APK from this page and install it over the old one. Your data stays." },
];

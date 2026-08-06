import { redirect } from "next/navigation";

/** Deep Scanner sidebar entry goes straight to the new-scan form. */
export default function ScannerHubPage() {
  redirect("/dashboard/scanner/new");
}

import { redirect } from "next/navigation";

export default function SupplierPerformanceRedirect() {
  redirect("/suppliers?tab=intel");
}

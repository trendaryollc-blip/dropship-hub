import { redirect } from "next/navigation";

export default function SRMRedirect() {
  redirect("/suppliers?tab=srm");
}

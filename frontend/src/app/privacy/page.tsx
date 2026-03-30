import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function PrivacyRedirect() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  redirect(`/${locale}/privacy`);
}

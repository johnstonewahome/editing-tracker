import { redirect } from "next/navigation";
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";

export default async function HomePage() {
  const authed = await isAuthenticatedNextjs();
  redirect(authed ? "/dashboard" : "/login");
}

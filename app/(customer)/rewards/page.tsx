import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RewardsDashboard } from "@/components/rewards/rewards-dashboard";

export const metadata = {
  title: "FuelPoints Rewards | NutriFlexs",
  description: "Earn FuelPoints through daily habits and meal orders, and redeem for instant discounts.",
};

export default async function RewardsPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!sessionUser?.id) {
    redirect("/login?callbackUrl=/rewards");
  }

  const role = (sessionUser.role || "CUSTOMER").toUpperCase();
  if (role === "TRAINER") {
    redirect("/trainer");
  }
  if (role !== "CUSTOMER") {
    redirect("/home");
  }

  return <RewardsDashboard />;
}

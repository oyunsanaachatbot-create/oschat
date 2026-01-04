import type { UserType } from "@/app/(auth)/auth";

type Entitlements = {
  maxMessagesPerDay: number;
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  guest: { maxMessagesPerDay: 20 },
  regular: { maxMessagesPerDay: 50 },
};

export function getEntitlements(userType: UserType): Entitlements {
  return entitlementsByUserType[userType] ?? entitlementsByUserType.guest;
}

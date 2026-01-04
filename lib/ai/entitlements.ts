import type { UserType } from "@/app/(auth)/auth";

type Entitlements = {
  maxMessagesPerDay: number;
};

// ✅ ямар UserType ч байсан map ажиллана
export const entitlementsByUserType: Partial<Record<UserType, Entitlements>> = {
  /**
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
  },

  /**
   * For users with an account
   */
  // "regular" гэдэг нь таны UserType-д байхгүй тул түр авав.
};

// ✅ ашиглахад helper (хэрвээ хаа нэг газар entitlementsByUserType[user.type] гэж авдаг бол)
export function getEntitlements(userType?: UserType): Entitlements {
  return (
    (userType && entitlementsByUserType[userType]) ?? {
      maxMessagesPerDay: 20,
    }
  );
}

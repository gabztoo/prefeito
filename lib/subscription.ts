export type SubscriptionDetails = {
  id: string;
  productId: string;
  status: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  organizationId: string | null;
};

export type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
  error?: string;
  errorType?: "CANCELED" | "EXPIRED" | "GENERAL";
};

export async function getSubscriptionDetails(): Promise<SubscriptionDetailsResult> {
  return { hasSubscription: false };
}

export async function isUserSubscribed(): Promise<boolean> {
  return false;
}

export async function hasAccessToProduct(productId: string): Promise<boolean> {
  return false;
}

export async function getUserSubscriptionStatus(): Promise<"active" | "canceled" | "expired" | "none"> {
  return "none";
}
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code:
        | "VALIDATION_ERROR"
        | "UNAUTHENTICATED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "CAMPAIGN_CLOSED"
        | "LINK_INACTIVE"
        | "DUPLICATE_PHONE"
        | "RATE_LIMITED"
        | "EMAIL_DELIVERY_FAILED"
        | "INTERNAL_ERROR"
        | "INVALID_TRANSITION";
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
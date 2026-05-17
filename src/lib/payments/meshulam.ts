import type { PaymentProviderConfig, PaymentSessionRequest, PaymentSessionResult } from "./types";

/** Meshulam integration placeholder — configure MESHULAM_API_KEY when ready. */
export async function createMeshulamSession(
  _config: PaymentProviderConfig,
  _req: PaymentSessionRequest,
): Promise<PaymentSessionResult> {
  throw new Error("Meshulam provider is not implemented yet. Use stripe or cardcom.");
}

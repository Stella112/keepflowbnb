import {
  catalogPaymentAllowlist
} from "./chunk-YQUACLG3.js";
import {
  loadStudioToml
} from "./chunk-AHE5Y6SQ.js";

// src/policy.ts
var Policy = class _Policy {
  budgetCapU;
  defaultBudgetU;
  maxPerRequestU;
  allowedPaymentTokens;
  erc8183;
  x402;
  constructor(fields = {}) {
    this.budgetCapU = fields.budgetCapU ?? "100";
    this.defaultBudgetU = fields.defaultBudgetU ?? "10";
    this.maxPerRequestU = fields.maxPerRequestU ?? "5";
    this.allowedPaymentTokens = Object.freeze([
      ...fields.allowedPaymentTokens ?? catalogPaymentAllowlist()
    ]);
    this.erc8183 = fields.erc8183 ?? {};
    this.x402 = fields.x402 ?? {};
    Object.freeze(this);
  }
  static fromToml(data) {
    const payments = data.payments ?? {};
    return new _Policy({
      budgetCapU: String(payments.budget_cap_u ?? "100"),
      defaultBudgetU: String(payments.default_budget_u ?? "10"),
      maxPerRequestU: String(payments.max_per_request_u ?? "5"),
      allowedPaymentTokens: payments.allowed_payment_tokens ?? catalogPaymentAllowlist(),
      erc8183: { ...payments.erc8183 ?? {} },
      x402: { ...payments.x402 ?? {} }
    });
  }
  /** True if `symbol` is on the spending allow-list. */
  isTokenAllowed(symbol) {
    return this.allowedPaymentTokens.includes(symbol);
  }
};
function getPolicy() {
  return Policy.fromToml(loadStudioToml());
}

export {
  Policy,
  getPolicy
};

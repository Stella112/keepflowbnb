import {
  getNetwork
} from "./chunk-YQUACLG3.js";

// src/x402/index.ts
import {
  X402AmountExceededError,
  X402PolicyError,
  X402RecipientMismatchError
} from "@bnbagent/sdk/x402";

// src/x402/sellerMock.ts
import { createHash } from "crypto";
import {
  isEip3009PaymentPayload,
  isPermit2PaymentPayload,
  recoverEip3009Payer,
  recoverPermit2ExactPayer
} from "@bnb-chain/b402";
import { getAddress } from "viem";
var MOCK_SIGNER = "0x1111111111111111111111111111111111111111";
var MOCK_PERMIT2_SPENDER = "0x2222222222222222222222222222222222222222";
var MockB402Facilitator = class {
  calls = {
    supported: 0,
    verify: [],
    settle: []
  };
  #options;
  #verifiedNonces = /* @__PURE__ */ new Set();
  #settlements = /* @__PURE__ */ new Map();
  constructor(options = {}) {
    this.#options = options;
  }
  async supported() {
    this.calls.supported += 1;
    return {
      extensions: [],
      kinds: ["bsc-mainnet", "bsc-testnet"].flatMap(
        (networkName) => {
          const network = getNetwork(networkName);
          return network.b402Assets().flatMap(
            (asset) => asset.b402Kinds.map((kind) => ({
              x402Version: 2,
              scheme: "exact",
              network: `eip155:${network.chainId}`,
              extra: {
                assetTransferMethod: kind.method,
                name: kind.name,
                version: kind.version,
                signerAddress: MOCK_SIGNER,
                // The real facilitator advertises the Permit2 proxy per kind;
                // B402ExactServerScheme copies it into the 402 requirements.
                ...kind.method === "permit2-exact" ? { spenderAddress: MOCK_PERMIT2_SPENDER } : {}
              }
            }))
          );
        }
      ),
      signers: { "eip155:*": [MOCK_SIGNER] }
    };
  }
  async verify(request) {
    this.calls.verify.push(request);
    const recovered = await recoverRequest(request);
    if ("error" in recovered) return recovered.error;
    if (this.#options.failVerify) {
      return {
        isValid: false,
        payer: recovered.payer,
        invalidReason: this.#options.failVerify
      };
    }
    if (this.#verifiedNonces.has(recovered.key)) {
      return {
        isValid: false,
        payer: recovered.payer,
        invalidReason: "nonce_already_used"
      };
    }
    this.#verifiedNonces.add(recovered.key);
    return { isValid: true, payer: recovered.payer };
  }
  async settle(request) {
    this.calls.settle.push(request);
    const recovered = await recoverRequest(request);
    if ("error" in recovered) {
      return {
        success: false,
        transaction: "",
        payer: "",
        network: request.paymentRequirements.network,
        errorReason: recovered.error.invalidReason
      };
    }
    const existing = this.#settlements.get(recovered.key);
    if (existing) return existing;
    if (this.#options.settleUnknown) {
      throw new Error("mock ambiguous settlement");
    }
    if (this.#options.failSettle) {
      return {
        success: false,
        transaction: "",
        payer: recovered.payer,
        network: request.paymentRequirements.network,
        errorReason: this.#options.failSettle
      };
    }
    const result = {
      success: true,
      transaction: `0x${createHash("sha256").update(recovered.key).digest("hex")}`,
      payer: recovered.payer,
      network: request.paymentRequirements.network,
      amount: request.paymentRequirements.amount
    };
    this.#settlements.set(recovered.key, result);
    return result;
  }
};
async function recoverRequest(request) {
  let recover;
  if (isEip3009PaymentPayload(request.paymentPayload)) {
    const payload = request.paymentPayload;
    recover = async () => ({
      payer: getAddress(await recoverEip3009Payer(payload)),
      from: payload.payload.authorization.from,
      nonce: payload.payload.authorization.nonce.toLowerCase()
    });
  } else if (isPermit2PaymentPayload(request.paymentPayload)) {
    const payload = request.paymentPayload;
    recover = async () => ({
      payer: getAddress(await recoverPermit2ExactPayer(payload)),
      from: payload.payload.permit2Authorization.from,
      nonce: payload.payload.permit2Authorization.nonce.toLowerCase()
    });
  } else {
    return {
      error: {
        isValid: false,
        invalidReason: "invalid_payload",
        payer: ""
      }
    };
  }
  try {
    const { payer, from, nonce } = await recover();
    if (payer.toLowerCase() !== from.toLowerCase()) {
      return {
        error: {
          isValid: false,
          invalidReason: "payer_mismatch",
          payer
        }
      };
    }
    return {
      payer,
      key: [
        request.paymentRequirements.network,
        payer.toLowerCase(),
        nonce
      ].join(":")
    };
  } catch {
    return {
      error: {
        isValid: false,
        invalidReason: "invalid_signature",
        payer: ""
      }
    };
  }
}

export {
  MockB402Facilitator,
  X402AmountExceededError,
  X402PolicyError,
  X402RecipientMismatchError
};

/**
 * Regression tests for Hyp return ownership (Fild* must not drive store/order auth).
 * Run: npx tsx src/lib/payments/hyp-return-ownership.test.ts
 */
import assert from "node:assert/strict";
import {
  hasExplicitStoreIdMismatch,
  pickHypOrderReference,
  resolveHypPaymentCore,
} from "./hyp-resolve";

const STORE = "hagor";

async function run() {
  // A: Fild1 = customer name, Order = valid id → must NOT STORE_MISMATCH
  {
    const params = {
      Order: "ord_valid_1",
      Fild1: "HYP ReturnTest",
      Fild2: "customer@example.com",
      Fild3: "",
      CCode: "0",
      Amount: "3",
      Id: "tx1",
      Sign: "sig1",
    };
    assert.equal(pickHypOrderReference(params), "ord_valid_1");
    assert.equal(hasExplicitStoreIdMismatch(params, STORE), false);

    const resolved = await resolveHypPaymentCore(params, {
      storeId: STORE,
      configured: true,
      lookupOrder: async (ref) =>
        ref === "ord_valid_1"
          ? { id: "ord_valid_1", storeId: STORE, orderNumber: "HAGOR-T-1", total: 3 }
          : null,
      verifyReturn: async () => true,
    });
    assert.equal(resolved.orderId, "ord_valid_1");
    assert.equal(resolved.storeId, STORE);
    assert.equal(resolved.success, true);
  }

  // B: Fild2 = customer email → irrelevant to store validation
  {
    const params = {
      Order: "ord_valid_2",
      Fild2: "wegodata001@gmail.com",
      CCode: "0",
      Amount: "3",
      Id: "tx2",
      Sign: "sig2",
    };
    assert.equal(pickHypOrderReference(params), "ord_valid_2");
    await resolveHypPaymentCore(params, {
      storeId: STORE,
      configured: true,
      lookupOrder: async () => ({
        id: "ord_valid_2",
        storeId: STORE,
        orderNumber: "HAGOR-T-2",
        total: 3,
      }),
      verifyReturn: async () => true,
    });
  }

  // C: Fild3 empty → must not prevent verification / must not be correlation key
  {
    const params = {
      Order: "ord_valid_3",
      Fild3: "",
      CCode: "0",
      Amount: "3",
      Id: "tx3",
      Sign: "sig3",
    };
    assert.equal(pickHypOrderReference(params), "ord_valid_3");
    assert.equal(pickHypOrderReference({ Fild3: "should-not-use" }), "");
    await resolveHypPaymentCore(params, {
      storeId: STORE,
      configured: true,
      lookupOrder: async () => ({
        id: "ord_valid_3",
        storeId: STORE,
        orderNumber: "HAGOR-T-3",
        total: 3,
      }),
      verifyReturn: async () => true,
    });
  }

  // D: unknown Order → reject
  {
    await assert.rejects(
      () =>
        resolveHypPaymentCore(
          { Order: "missing", CCode: "0", Amount: "3", Id: "tx", Sign: "s" },
          {
            storeId: STORE,
            configured: true,
            lookupOrder: async () => null,
            verifyReturn: async () => true,
          },
        ),
      /ORDER_NOT_FOUND/,
    );
  }

  // E: valid Order but invalid VERIFY → NOT PAID
  {
    await assert.rejects(
      () =>
        resolveHypPaymentCore(
          { Order: "ord_e", CCode: "0", Amount: "3", Id: "tx", Sign: "bad" },
          {
            storeId: STORE,
            configured: true,
            lookupOrder: async () => ({
              id: "ord_e",
              storeId: STORE,
              orderNumber: "HAGOR-E",
              total: 3,
            }),
            verifyReturn: async () => false,
          },
        ),
      /HYP_VERIFY_FAILED/,
    );
  }

  // F: valid VERIFY but amount mismatch → NOT PAID
  {
    await assert.rejects(
      () =>
        resolveHypPaymentCore(
          { Order: "ord_f", CCode: "0", Amount: "9.99", Id: "tx", Sign: "s" },
          {
            storeId: STORE,
            configured: true,
            lookupOrder: async () => ({
              id: "ord_f",
              storeId: STORE,
              orderNumber: "HAGOR-F",
              total: 3,
            }),
            verifyReturn: async () => true,
          },
        ),
      /AMOUNT_MISMATCH/,
    );
  }

  // G: valid VERIFY for expected order + amount → success payload
  {
    const resolved = await resolveHypPaymentCore(
      {
        Order: "ord_g",
        CCode: "0",
        Amount: "3.00",
        Id: "tx-g",
        Sign: "ok",
        ACode: "123",
        Fild1: "Customer Name",
      },
      {
        storeId: STORE,
        configured: true,
        lookupOrder: async () => ({
          id: "ord_g",
          storeId: STORE,
          orderNumber: "HAGOR-G",
          total: 3,
        }),
        verifyReturn: async () => true,
      },
    );
    assert.equal(resolved.success, true);
    assert.equal(resolved.amount, 3);
    assert.equal(resolved.transactionId, "tx-g");
    assert.equal(resolved.orderId, "ord_g");
  }

  console.log("PASS hyp-return-ownership tests A–G");
}

run().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { syncAccess, policyBody } from "../access.js";

test("policyBody: mails únicos y ordenados", () => {
  assert.deepEqual(policyBody(["b@x.com", "a@x.com", "b@x.com"]).include, [{ email: { email: "a@x.com" } }, { email: { email: "b@x.com" } }]);
});
test("syncAccess: sin config no llama; con config hace PUT", async () => {
  let call = null; const f = async (u, o) => { call = [u, o]; return { json: async () => ({ success: true }) }; };
  assert.equal(await syncAccess({}, ["a@x.com"], f), false); assert.equal(call, null);
  assert.equal(await syncAccess({ CF_API_TOKEN: "t", CF_ACCOUNT_ID: "acc", CF_ACCESS_APP: "app", CF_ACCESS_POLICY: "pol" }, ["a@x.com"], f), true);
  assert.match(call[0], /accounts\/acc\/access\/apps\/app\/policies\/pol$/); assert.equal(call[1].method, "PUT");
});

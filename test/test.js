import { ControlledRequest, controlledFetch } from "../trafficControl/trafficControl.js";
import {
  assert,
  assertEquals,
  assertStringContains,
} from "https://deno.land/std/testing/asserts.ts";

Deno.test("basic request - 200", async () => {
  const req = new ControlledRequest("https://success-200.thegagne.workers.dev");
  const res = await controlledFetch(req);
  await res.text();
  assertEquals(res.status, 200);
});

Deno.test("retry - 500", async () => {
  const trafficPolicy = {
    retries: 3,
  };
  const req = new ControlledRequest("https://error-500.thegagne.workers.dev", {
    trafficPolicy: trafficPolicy,
  });
  const res = await controlledFetch(req);
  const trafficInfoHeader = res.headers.get("traffic-info");
  await res.text();
  assertStringContains(trafficInfoHeader, "retries=3");
});


Deno.test("delay - 300ms", async () => {
  const trafficPolicy = {
    delay: 300,
  };
  const req = new ControlledRequest("https://success-200.thegagne.workers.dev", {
    trafficPolicy: trafficPolicy,
  });
  const before = Date.now();
  const res = await controlledFetch(req);
  const after = Date.now();
  await res.text();
  assert(after - 300 >= before);
});

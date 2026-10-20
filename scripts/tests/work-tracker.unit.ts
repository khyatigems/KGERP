import assert from "node:assert/strict";
import { classifyDomain, subtract, splitDays, dateBoundary, weekKey, occupy, startSchema, eventSchema, targetSchema } from "@/lib/work-tracker/core";
import { eligibleTab, classifyDomain as extensionClassify } from "../../extensions/work-tracker/src/platform-detection.js";
import { sliceInterval, removeIdle, readyEvents, acknowledge } from "../../extensions/work-tracker/src/activity-tracker.js";
import { sendEvents, validateSettings, defaults } from "../../extensions/work-tracker/src/api-client.js";

async function main() {
  for (const [host, expected] of Object.entries({ "erp.khyatigems.com": "ERP", "www.ebay.com": "EBAY", "sellercentral.amazon.in": "AMAZON", "www.etsy.com": "ETSY", "ebay.com.evil.test": null, "evil-etsy.com": null, "random.amazon.com": null, "erp.khyatigems.com.evil.test": null })) {
    assert.equal(classifyDomain(host), expected); assert.equal(extensionClassify(host), expected);
  }
  assert.deepEqual(subtract({ start: 0, end: 100 }, [{ start: 20, end: 60 }, { start: 50, end: 90 }]), [{ start: 0, end: 20 }, { start: 90, end: 100 }]);
  const occupied = [{ start: 0, end: 20 }]; occupy(occupied, { start: 20, end: 40 }); assert.deepEqual(occupied, [{ start: 0, end: 40 }]);
  assert.equal(dateBoundary("2026-10-20", "Asia/Kolkata"), "2026-10-19T18:30:00.000Z");
  assert.equal(+new Date(dateBoundary("2026-03-09", "America/New_York")) - +new Date(dateBoundary("2026-03-08", "America/New_York")), 23 * 3600000);
  assert.equal(+new Date(dateBoundary("2026-11-02", "America/New_York")) - +new Date(dateBoundary("2026-11-01", "America/New_York")), 25 * 3600000);
  const days = splitDays({ start: +new Date("2026-10-19T18:29:00Z"), end: +new Date("2026-10-19T18:31:00Z") }, "Asia/Kolkata");
  assert.deepEqual(days.map(d => [d.day, d.end - d.start]), [["2026-10-19", 60000], ["2026-10-20", 60000]]);
  assert.equal(weekKey("2026-10-20"), "2026-10-19");
  assert.equal(targetSchema.safeParse({ platform: "ERP", period: "DAILY", targetMinutes: 1441 }).success, false);
  assert.equal(targetSchema.safeParse({ platform: "ERP", period: "WEEKLY", targetMinutes: 10080 }).success, true);
  assert.equal(startSchema.safeParse({ userId: "spoof", requestId: crypto.randomUUID(), platform: "ERP", activityType: "OTHER" }).success, false);
  assert.equal(eventSchema.safeParse({ id: crypto.randomUUID(), platform: "ERP", domain: "https://erp.khyatigems.com/password", activityType: "OTHER", eventType: "ACTIVE", occurredAt: new Date().toISOString() }).success, false);
  assert.equal(eligibleTab({ url: "https://www.ebay.com/itm/secret?x=password" }, false, "active", "erp.khyatigems.com"), null);
  assert.equal(eligibleTab({ url: "https://www.ebay.com/" }, true, "idle", "erp.khyatigems.com"), null);
  assert.deepEqual(["https://www.ebay.com", "https://www.etsy.com", "https://sellercentral.amazon.in", "https://erp.khyatigems.com"].map(url => eligibleTab({ url }, true, "active", "erp.khyatigems.com")?.platform), ["EBAY", "ETSY", "AMAZON", "ERP"]);
  const previous = { at: 100000, platform: "EBAY", domain: "www.ebay.com", activityType: "OTHER", classificationOverride: false };
  assert.equal(sliceInterval(previous, 200000), null); // suspended worker / restart gap
  const event = sliceInterval(previous, 130000)!;
  assert.equal(event.startedAt, new Date(100000).toISOString());
  assert.equal(removeIdle([event], 99000).length, 0);
  assert.equal(removeIdle([event], 115000)[0].occurredAt, new Date(115000).toISOString());
  assert.equal(readyEvents([event], 300000, 300).length, 0);
  assert.equal(readyEvents([event], 600000, 300).length, 1);
  assert.equal(acknowledge([event], [event.id]).length, 0);
  assert.throws(() => validateSettings({ ...defaults, erpUrl: "http://evil.test", token: "x" }));
  const sent: string[] = [];
  const config = { ...defaults, token: `kgwt_${"x".repeat(43)}` };
  let first = true;
  const fakeFetch: typeof fetch = async (_url, options) => {
    sent.push(JSON.parse(options!.body as string).events[0].id);
    if (first) { first = false; throw new Error("temporary network failure"); }
    return new Response(JSON.stringify({ accepted: [event.id] }));
  };
  await assert.rejects(sendEvents(config, [event], fakeFetch));
  assert.deepEqual(await sendEvents(config, [event], fakeFetch), [event.id]); assert.deepEqual(sent, [event.id, event.id]);
  console.log("Work tracker unit tests passed: domains, focus, idle, transitions, retries, privacy, DST and overlap logic");
}
main().catch(error => { console.error(error); process.exitCode = 1; });

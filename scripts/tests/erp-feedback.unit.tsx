import assert from "node:assert/strict";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { toast, notify, notifyAction } from "@/lib/erp-feedback";
import { InventorySaveProgressToast } from "@/components/inventory/inventory-save-progress-toast";
import { getInventoryCompleteness } from "@/lib/inventory-completeness";

// Sonner schedules browser dismissal events on the next animation frame.
globalThis.requestAnimationFrame = (callback) => { callback(0); return 0; };

const markup = (node: ReactNode | (() => ReactNode)) => renderToStaticMarkup(createElement("div", null, typeof node === "function" ? node() : node));
const current = (id: string | number) => {
  const entry = toast.getToasts().find((item) => item.id === id);
  assert.ok(entry);
  assert.ok(!("dismiss" in entry));
  return entry;
};

const id = toast.loading("Saving item", { id: "feedback-test", description: "Writing item details" });
assert.equal(current(id).duration, Infinity);
assert.match(markup(current(id).title), /In progress/);
assert.match(markup(current(id).description), /<details/);
const onClick = () => {};
toast.success("Item saved", { id, duration: 8000, action: { label: "View item", onClick } });
assert.equal(toast.getToasts().filter((item) => item.id === id).length, 1);
assert.equal(current(id).type, "success");
assert.equal(current(id).duration, 8000);
assert.equal((current(id).action as { onClick: unknown }).onClick, onClick);
assert.match(markup(current(id).title), /Completed/);
assert.equal(current(id).description, undefined);

toast.error("Prisma constraint P2002", { id, description: "SQL database error" });
assert.doesNotMatch(markup(current(id).title), /Prisma|P2002/);
assert.doesNotMatch(markup(current(id).description), /SQL|database error/);
assert.match(markup(current(id).title), /Please try again/);
assert.equal(notify("important_activity", "Keep in inbox"), "persistent");
assert.equal(notify("contextual_warning", "Field warning"), "inline");
notifyAction("Saved", "Open", onClick, { id });
assert.match(markup(current(id).title), /Completed/);
assert.equal((current(id).action as { label: string }).label, "Open");
assert.equal(current(id).duration, 8000, "actions allow time to read and respond");
toast.error("Save failed", { id, action: { label: "Retry", onClick } });
assert.equal(current(id).duration, 8000);
toast.info("Copied", { id });
assert.equal(current(id).duration, 4500);

const completeness = getInventoryCompleteness({ itemName: "Ruby" });
const inventory = renderToStaticMarkup(createElement(InventorySaveProgressToast, { itemName: "Ruby", completeness, status: "success", isUpdate: true }));
assert.match(inventory, /Inventory updated/);
assert.match(inventory, /completeness/);
assert.match(inventory, /Missing/); // A saved item must not falsely mark missing fields as complete.
assert.match(inventory, /<details/);
toast.dismiss(id);
assert.equal(toast.getToasts().some((item) => item.id === id), false);
console.log("ERP feedback checks passed");

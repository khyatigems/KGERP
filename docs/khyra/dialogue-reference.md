# Complete event dialogue reference

Generated from the central source. Edit lib/khyra/workflows.json, special-messages.json and catalog.ts, then run npm run build:khyra-library.

## inventory.create.started

- Module: inventory
- Trigger: Use the permission-checked inventory.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Adding your gemstone…

**friendly:** I'm adding your gemstone. I'll share the confirmed result.

**detailed:** I'm working on this request: adding your gemstone.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.create.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.create workflow. The authoritative backend confirms the exact result described: Your gemstone has been added to inventory. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved / saved, bell, activity, companion
- Dynamic variables: gemstone_name, carat_weight, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Your gemstone has been added to inventory.

**friendly:** Perfect! Your gemstone[[, {gemstone_name},]] has been added to inventory.[[ Its recorded weight is {carat_weight} carats.]]

**detailed:** The gemstone has been added to inventory.[[ Name: {gemstone_name}.]][[ Recorded carat weight: {carat_weight}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.create.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** I couldn't confirm the result: adding your gemstone.

**friendly:** I couldn't finish adding your gemstone. Shall we check the existing record before trying again?

**detailed:** This request needs review: adding your gemstone. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: adding your gemstone. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.update.started

- Module: inventory
- Trigger: Use the permission-checked inventory.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Saving gemstone details…

**friendly:** This request is in progress: saving gemstone details. I'll wait for its confirmed result.

**detailed:** I'm working on this request: saving gemstone details.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.update.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.update workflow. The authoritative backend confirms the exact result described: Your gemstone details have been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Your gemstone details have been updated.

**friendly:** Those gemstone details are saved and ready for your review.

**detailed:** Your gemstone details have been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.update.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** I couldn't confirm the result: saving gemstone details.

**friendly:** Something interrupted saving gemstone details. Please review the record before repeating it.

**detailed:** This request needs review: saving gemstone details. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving gemstone details. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.delete.started

- Module: inventory
- Trigger: Use the permission-checked inventory.delete workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: components/inventory/inventory-actions.tsx

**short:** Removing the gemstone…

**friendly:** This request is in progress: removing the gemstone. I'll wait for its confirmed result.

**detailed:** I'm working on this request: removing the gemstone.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.delete.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.delete workflow. The authoritative backend confirms the exact result described: The selected gemstone has been removed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: components/inventory/inventory-actions.tsx

**short:** The selected gemstone has been removed.

**friendly:** The gemstone record has been removed as requested.

**detailed:** The selected gemstone has been removed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.delete.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.delete workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: components/inventory/inventory-actions.tsx

**short:** I couldn't confirm the result: removing the gemstone.

**friendly:** Something interrupted removing the gemstone. Please review the record before repeating it.

**detailed:** This request needs review: removing the gemstone. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: removing the gemstone. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.import.started

- Module: inventory
- Trigger: Use the permission-checked inventory.import workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Importing inventory…

**friendly:** This request is in progress: importing inventory. I'll wait for its confirmed result.

**detailed:** I'm working on this request: importing inventory.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.import.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.import workflow. The authoritative backend confirms the exact result described: The inventory import has finished. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** The inventory import has finished.

**friendly:** Your inventory import is ready to review. Let's check the accepted records.

**detailed:** The inventory import has finished.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.import.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.import workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** I couldn't confirm the result: importing inventory.

**friendly:** Something interrupted importing inventory. Please review the record before repeating it.

**detailed:** This request needs review: importing inventory. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: importing inventory. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.bulk_update.started

- Module: inventory
- Trigger: Use the permission-checked inventory.bulk update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Updating selected gemstones…

**friendly:** I'm updating selected gemstones. I'll share the confirmed result.

**detailed:** I'm working on this request: updating selected gemstones.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.bulk_update.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.bulk update workflow. The authoritative backend confirms the exact result described: The selected gemstone records have been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** The selected gemstone records have been updated.

**friendly:** Your selected gemstones have their new details. A quick review is available.

**detailed:** The selected gemstone records have been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.bulk_update.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.bulk update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** I couldn't confirm the result: updating selected gemstones.

**friendly:** I couldn't finish updating selected gemstones. Shall we check the existing record before trying again?

**detailed:** This request needs review: updating selected gemstones. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating selected gemstones. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.status.started

- Module: inventory
- Trigger: Use the permission-checked inventory.status workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Saving inventory status…

**friendly:** I'm saving inventory status. I'll share the confirmed result.

**detailed:** I'm working on this request: saving inventory status.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.status.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.status workflow. The authoritative backend confirms the exact result described: The inventory status has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** The inventory status has been updated.

**friendly:** The stock status is saved. You can check the item when you're ready.

**detailed:** The inventory status has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.status.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.status workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** I couldn't confirm the result: saving inventory status.

**friendly:** I couldn't finish saving inventory status. Shall we check the existing record before trying again?

**detailed:** This request needs review: saving inventory status. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving inventory status. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.export.started

- Module: inventory
- Trigger: Use the permission-checked inventory.export workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Preparing the inventory export…

**friendly:** Let me take care of this step: preparing the inventory export.

**detailed:** I'm working on this request: preparing the inventory export.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.export.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.export workflow. The authoritative backend confirms the exact result described: Your inventory export is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Your inventory export is ready.

**friendly:** Your inventory export is ready to download. Nicely organised!

**detailed:** Your inventory export is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.export.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.export workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** I couldn't confirm the result: preparing the inventory export.

**friendly:** I noticed a problem while preparing the inventory export. Shall we review the details?

**detailed:** This request needs review: preparing the inventory export. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the inventory export. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.sku.started

- Module: inventory
- Trigger: Use the permission-checked inventory.sku workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Generating the SKU…

**friendly:** This request is in progress: generating the sku. I'll wait for its confirmed result.

**detailed:** I'm working on this request: generating the sku.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.sku.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.sku workflow. The authoritative backend confirms the exact result described: A SKU has been generated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** A SKU has been generated.

**friendly:** Your new SKU is ready. Let's keep the gemstone easy to find.

**detailed:** A SKU has been generated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.sku.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.sku workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** I couldn't confirm the result: generating the sku.

**friendly:** Something interrupted generating the sku. Please review the record before repeating it.

**detailed:** This request needs review: generating the sku. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: generating the sku. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.pair_confirm.started

- Module: inventory
- Trigger: Use the permission-checked inventory.pair confirm workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/inventory/pairs/confirm/route.ts

**short:** Confirming the gemstone pair…

**friendly:** Confirming the gemstone pair. You can keep working while it runs.

**detailed:** I'm working on this request: confirming the gemstone pair.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.pair_confirm.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.pair confirm workflow. The authoritative backend confirms the exact result described: The gemstone pair has been confirmed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/inventory/pairs/confirm/route.ts

**short:** The gemstone pair has been confirmed.

**friendly:** Your gemstone pair is confirmed and ready to review.

**detailed:** The gemstone pair has been confirmed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.pair_confirm.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.pair confirm workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/inventory/pairs/confirm/route.ts

**short:** I couldn't confirm the result: confirming the gemstone pair.

**friendly:** That step needs a closer look: confirming the gemstone pair. Let's check the saved record first.

**detailed:** This request needs review: confirming the gemstone pair. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: confirming the gemstone pair. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.pair_reject.started

- Module: inventory
- Trigger: Use the permission-checked inventory.pair reject workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/inventory/pairs/reject/route.ts

**short:** Recording the pair decision…

**friendly:** I'm recording the pair decision. I'll share the confirmed result.

**detailed:** I'm working on this request: recording the pair decision.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.pair_reject.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.pair reject workflow. The authoritative backend confirms the exact result described: The suggested pair has been rejected. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/inventory/pairs/reject/route.ts

**short:** The suggested pair has been rejected.

**friendly:** I've recorded that pair decision. The gemstones remain available for review.

**detailed:** The suggested pair has been rejected.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.pair_reject.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.pair reject workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/inventory/pairs/reject/route.ts

**short:** I couldn't confirm the result: recording the pair decision.

**friendly:** I couldn't finish recording the pair decision. Shall we check the existing record before trying again?

**detailed:** This request needs review: recording the pair decision. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: recording the pair decision. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.set_create.started

- Module: inventory
- Trigger: Use the permission-checked inventory.set create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/inventory/sets/create/route.ts

**short:** Creating the gemstone set…

**friendly:** This request is in progress: creating the gemstone set. I'll wait for its confirmed result.

**detailed:** I'm working on this request: creating the gemstone set.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.set_create.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.set create workflow. The authoritative backend confirms the exact result described: The gemstone set has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/inventory/sets/create/route.ts

**short:** The gemstone set has been saved.

**friendly:** Your gemstone set is saved. Shall we review its members?

**detailed:** The gemstone set has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.set_create.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.set create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/inventory/sets/create/route.ts

**short:** I couldn't confirm the result: creating the gemstone set.

**friendly:** Something interrupted creating the gemstone set. Please review the record before repeating it.

**detailed:** This request needs review: creating the gemstone set. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: creating the gemstone set. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.description.started

- Module: inventory
- Trigger: Use the permission-checked inventory.description workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/ai/inventory-description/route.ts

**short:** Preparing a product description…

**friendly:** I'm preparing a product description. I'll share the confirmed result.

**detailed:** I'm working on this request: preparing a product description.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.description.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.description workflow. The authoritative backend confirms the exact result described: A description draft is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/ai/inventory-description/route.ts

**short:** A description draft is ready.

**friendly:** Your description draft is ready. Please review its gemstone facts before using it.

**detailed:** A description draft is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.description.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.description workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/api/ai/inventory-description/route.ts

**short:** I couldn't confirm the result: preparing a product description.

**friendly:** I couldn't finish preparing a product description. Shall we check the existing record before trying again?

**detailed:** This request needs review: preparing a product description. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing a product description. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## inventory.qr_authorize.started

- Module: inventory
- Trigger: Use the permission-checked inventory.qr authorize workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/qr-payment-actions.ts

**short:** Saving QR payment controls…

**friendly:** Saving QR payment controls. You can keep working while it runs.

**detailed:** I'm working on this request: saving qr payment controls.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## inventory.qr_authorize.completed

- Module: inventory
- Trigger: Use the permission-checked inventory.qr authorize workflow. The authoritative backend confirms the exact result described: The QR payment authorisation has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/qr-payment-actions.ts

**short:** The QR payment authorisation has been saved.

**friendly:** Your QR payment controls are saved for this gemstone.

**detailed:** The QR payment authorisation has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in inventory?


## inventory.qr_authorize.failed

- Module: inventory
- Trigger: Use the permission-checked inventory.qr authorize workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/qr-payment-actions.ts

**short:** I couldn't confirm the result: saving qr payment controls.

**friendly:** That step needs a closer look: saving qr payment controls. Let's check the saved record first.

**detailed:** This request needs review: saving qr payment controls. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving qr payment controls. Check the record before repeating the action.

**followUp:** Shall we review inventory and check the next safe step?


## media.upload.started

- Module: media
- Trigger: Use the permission-checked media.upload workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Products (/inventory; inventory:view)
- Sources: app/api/media/upload/route.ts

**short:** Uploading product media…

**friendly:** This request is in progress: uploading product media. I'll wait for its confirmed result.

**detailed:** I'm working on this request: uploading product media.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## media.upload.completed

- Module: media
- Trigger: Use the permission-checked media.upload workflow. The authoritative backend confirms the exact result described: Your product media has been uploaded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Products (/inventory; inventory:view)
- Sources: app/api/media/upload/route.ts

**short:** Your product media has been uploaded.

**friendly:** Your product media is uploaded. Let's check how it looks.

**detailed:** Your product media has been uploaded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in product photography and media?


## media.upload.failed

- Module: media
- Trigger: Use the permission-checked media.upload workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Products (/inventory; inventory:view)
- Sources: app/api/media/upload/route.ts

**short:** I couldn't confirm the result: uploading product media.

**friendly:** Something interrupted uploading product media. Please review the record before repeating it.

**detailed:** This request needs review: uploading product media. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: uploading product media. Check the record before repeating the action.

**followUp:** Shall we review product photography and media and check the next safe step?


## media.batch_upload.started

- Module: media
- Trigger: Use the permission-checked media.batch upload workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Products (/inventory; inventory:view)
- Sources: app/api/media/upload/route.ts

**short:** Uploading selected images…

**friendly:** I'm uploading selected images. I'll share the confirmed result.

**detailed:** I'm working on this request: uploading selected images.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## media.batch_upload.completed

- Module: media
- Trigger: Use the permission-checked media.batch upload workflow. The authoritative backend confirms the exact result described: The image uploads have finished. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Products (/inventory; inventory:view)
- Sources: app/api/media/upload/route.ts

**short:** The image uploads have finished.

**friendly:** Your image uploads are complete. The product gallery is ready for review.

**detailed:** The image uploads have finished.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in product photography and media?


## media.batch_upload.failed

- Module: media
- Trigger: Use the permission-checked media.batch upload workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Products (/inventory; inventory:view)
- Sources: app/api/media/upload/route.ts

**short:** I couldn't confirm the result: uploading selected images.

**friendly:** I couldn't finish uploading selected images. Shall we check the existing record before trying again?

**detailed:** This request needs review: uploading selected images. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: uploading selected images. Check the record before repeating the action.

**followUp:** Shall we review product photography and media and check the next safe step?


## media.process.started

- Module: media
- Trigger: Use the permission-checked media.process workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** Processing the product image…

**friendly:** Processing the product image. You can keep working while it runs.

**detailed:** I'm working on this request: processing the product image.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## media.process.completed

- Module: media
- Trigger: Use the permission-checked media.process workflow. The authoritative backend confirms the exact result described: The product image has been processed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The product image has been processed.

**friendly:** The image is ready. Shall we check the final result?

**detailed:** The product image has been processed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in product photography and media?


## media.process.failed

- Module: media
- Trigger: Use the permission-checked media.process workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** I couldn't confirm the result: processing the product image.

**friendly:** That step needs a closer look: processing the product image. Let's check the saved record first.

**detailed:** This request needs review: processing the product image. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: processing the product image. Check the record before repeating the action.

**followUp:** Shall we review product photography and media and check the next safe step?


## media.delete.started

- Module: media
- Trigger: Use the permission-checked media.delete workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** Removing selected media…

**friendly:** Removing selected media. You can keep working while it runs.

**detailed:** I'm working on this request: removing selected media.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## media.delete.completed

- Module: media
- Trigger: Use the permission-checked media.delete workflow. The authoritative backend confirms the exact result described: The selected media has been removed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The selected media has been removed.

**friendly:** That media has been removed from the product record.

**detailed:** The selected media has been removed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in product photography and media?


## media.delete.failed

- Module: media
- Trigger: Use the permission-checked media.delete workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** I couldn't confirm the result: removing selected media.

**friendly:** That step needs a closer look: removing selected media. Let's check the saved record first.

**detailed:** This request needs review: removing selected media. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: removing selected media. Check the record before repeating the action.

**followUp:** Shall we review product photography and media and check the next safe step?


## media.reorder.started

- Module: media
- Trigger: Use the permission-checked media.reorder workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** Saving the gallery order…

**friendly:** Saving the gallery order. You can keep working while it runs.

**detailed:** I'm working on this request: saving the gallery order.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## media.reorder.completed

- Module: media
- Trigger: Use the permission-checked media.reorder workflow. The authoritative backend confirms the exact result described: The gallery order has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The gallery order has been saved.

**friendly:** Your gallery now follows the order you chose.

**detailed:** The gallery order has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in product photography and media?


## media.reorder.failed

- Module: media
- Trigger: Use the permission-checked media.reorder workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** I couldn't confirm the result: saving the gallery order.

**friendly:** That step needs a closer look: saving the gallery order. Let's check the saved record first.

**detailed:** This request needs review: saving the gallery order. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the gallery order. Check the record before repeating the action.

**followUp:** Shall we review product photography and media and check the next safe step?


## orders.import.started

- Module: orders
- Trigger: Use the permission-checked orders.import workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** Importing marketplace orders…

**friendly:** I'm importing marketplace orders. I'll share the confirmed result.

**detailed:** I'm working on this request: importing marketplace orders.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## orders.import.completed

- Module: orders
- Trigger: Use the permission-checked orders.import workflow. The authoritative backend confirms the exact result described: The order import has finished. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** The order import has finished.

**friendly:** Your imported orders are ready to review. Let's check what needs attention.

**detailed:** The order import has finished.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in marketplace orders?


## orders.import.failed

- Module: orders
- Trigger: Use the permission-checked orders.import workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** I couldn't confirm the result: importing marketplace orders.

**friendly:** I couldn't finish importing marketplace orders. Shall we check the existing record before trying again?

**detailed:** This request needs review: importing marketplace orders. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: importing marketplace orders. Check the record before repeating the action.

**followUp:** Shall we review marketplace orders and check the next safe step?


## orders.update.started

- Module: orders
- Trigger: Use the permission-checked orders.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** Updating the order record…

**friendly:** I'm updating the order record. I'll share the confirmed result.

**detailed:** I'm working on this request: updating the order record.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## orders.update.completed

- Module: orders
- Trigger: Use the permission-checked orders.update workflow. The authoritative backend confirms the exact result described: The order record has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** The order record has been updated.

**friendly:** The order details are saved. Shall we review the next step?

**detailed:** The order record has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in marketplace orders?


## orders.update.failed

- Module: orders
- Trigger: Use the permission-checked orders.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** I couldn't confirm the result: updating the order record.

**friendly:** I couldn't finish updating the order record. Shall we check the existing record before trying again?

**detailed:** This request needs review: updating the order record. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating the order record. Check the record before repeating the action.

**followUp:** Shall we review marketplace orders and check the next safe step?


## orders.export.started

- Module: orders
- Trigger: Use the permission-checked orders.export workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** Preparing the order export…

**friendly:** This request is in progress: preparing the order export. I'll wait for its confirmed result.

**detailed:** I'm working on this request: preparing the order export.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## orders.export.completed

- Module: orders
- Trigger: Use the permission-checked orders.export workflow. The authoritative backend confirms the exact result described: The order export is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** The order export is ready.

**friendly:** Your order export is ready to download.

**detailed:** The order export is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in marketplace orders?


## orders.export.failed

- Module: orders
- Trigger: Use the permission-checked orders.export workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** I couldn't confirm the result: preparing the order export.

**friendly:** Something interrupted preparing the order export. Please review the record before repeating it.

**detailed:** This request needs review: preparing the order export. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the order export. Check the record before repeating the action.

**followUp:** Shall we review marketplace orders and check the next safe step?


## fulfillment.suggest.started

- Module: fulfillment
- Trigger: Use the permission-checked fulfillment.suggest workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / thinking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Stock fulfilment (/marketplace-orders; listings:view)
- Sources: lib/fulfillment/fulfillment.ts

**short:** Finding available stock alternatives…

**friendly:** Let me take care of this step: finding available stock alternatives.

**detailed:** I'm working on this request: finding available stock alternatives.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## fulfillment.suggest.completed

- Module: fulfillment
- Trigger: Use the permission-checked fulfillment.suggest workflow. The authoritative backend confirms the exact result described: The stock alternatives are ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Stock fulfilment (/marketplace-orders; listings:view)
- Sources: lib/fulfillment/fulfillment.ts

**short:** The stock alternatives are ready.

**friendly:** The available stock alternatives are ready for review. You'll choose what fits the order.

**detailed:** The stock alternatives are ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in stock fulfilment?


## fulfillment.suggest.failed

- Module: fulfillment
- Trigger: Use the permission-checked fulfillment.suggest workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Stock fulfilment (/marketplace-orders; listings:view)
- Sources: lib/fulfillment/fulfillment.ts

**short:** I couldn't confirm the result: finding available stock alternatives.

**friendly:** I noticed a problem while finding available stock alternatives. Shall we review the details?

**detailed:** This request needs review: finding available stock alternatives. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: finding available stock alternatives. Check the record before repeating the action.

**followUp:** Shall we review stock fulfilment and check the next safe step?


## fulfillment.assign.started

- Module: fulfillment
- Trigger: Use the permission-checked fulfillment.assign workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** Saving the fulfilment selection…

**friendly:** Saving the fulfilment selection. You can keep working while it runs.

**detailed:** I'm working on this request: saving the fulfilment selection.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## fulfillment.assign.completed

- Module: fulfillment
- Trigger: Use the permission-checked fulfillment.assign workflow. The authoritative backend confirms the exact result described: The fulfilment selection has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The fulfilment selection has been saved.

**friendly:** Your stock selection is saved. This does not confirm dispatch.

**detailed:** The fulfilment selection has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in stock fulfilment?


## fulfillment.assign.failed

- Module: fulfillment
- Trigger: Use the permission-checked fulfillment.assign workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** I couldn't confirm the result: saving the fulfilment selection.

**friendly:** That step needs a closer look: saving the fulfilment selection. Let's check the saved record first.

**detailed:** This request needs review: saving the fulfilment selection. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the fulfilment selection. Check the record before repeating the action.

**followUp:** Shall we review stock fulfilment and check the next safe step?


## fulfillment.split.started

- Module: fulfillment
- Trigger: Use the permission-checked fulfillment.split workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** Saving the split allocation…

**friendly:** I'm saving the split allocation. I'll share the confirmed result.

**detailed:** I'm working on this request: saving the split allocation.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## fulfillment.split.completed

- Module: fulfillment
- Trigger: Use the permission-checked fulfillment.split workflow. The authoritative backend confirms the exact result described: The split stock allocation has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The split stock allocation has been saved.

**friendly:** The split allocation is saved for your review.

**detailed:** The split stock allocation has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in stock fulfilment?


## fulfillment.split.failed

- Module: fulfillment
- Trigger: Use the permission-checked fulfillment.split workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** I couldn't confirm the result: saving the split allocation.

**friendly:** I couldn't finish saving the split allocation. Shall we check the existing record before trying again?

**detailed:** This request needs review: saving the split allocation. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the split allocation. Check the record before repeating the action.

**followUp:** Shall we review stock fulfilment and check the next safe step?


## reports.generate.started

- Module: reports
- Trigger: Use the permission-checked reports.generate workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** Preparing your report…

**friendly:** I'm preparing your report. I'll share the confirmed result.

**detailed:** I'm working on this request: preparing your report.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## reports.generate.completed

- Module: reports
- Trigger: Use the permission-checked reports.generate workflow. The authoritative backend confirms the exact result described: Your report is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved / saved, bell, activity, companion
- Dynamic variables: report_period, record_label, affected_count, context_summary
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** Your report is ready.

**friendly:** All done! Your report[[ for {report_period}]] is ready. Shall we take a look?

**detailed:** Your report is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in reports and exports?


## reports.generate.failed

- Module: reports
- Trigger: Use the permission-checked reports.generate workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, activity, companion
- Dynamic variables: record_label
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** I couldn't confirm the result: preparing your report.

**friendly:** I couldn't finish preparing your report. Shall we check the existing record before trying again?

**detailed:** This request needs review: preparing your report. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing your report. Check the record before repeating the action.

**followUp:** Shall we review reports and exports and check the next safe step?


## reports.export.started

- Module: reports
- Trigger: Use the permission-checked reports.export workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** Preparing your export…

**friendly:** This request is in progress: preparing your export. I'll wait for its confirmed result.

**detailed:** I'm working on this request: preparing your export.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## reports.export.completed

- Module: reports
- Trigger: Use the permission-checked reports.export workflow. The authoritative backend confirms the exact result described: Your export is ready to download. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved / saved, bell, activity, companion
- Dynamic variables: report_period, record_label, affected_count, context_summary
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** Your export is ready to download.

**friendly:** All done! Your report[[ for {report_period}]] is ready. Shall we take a look?

**detailed:** Your export is ready to download.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in reports and exports?


## reports.export.failed

- Module: reports
- Trigger: Use the permission-checked reports.export workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, activity, companion
- Dynamic variables: record_label
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** I couldn't confirm the result: preparing your export.

**friendly:** Something interrupted preparing your export. Please review the record before repeating it.

**detailed:** This request needs review: preparing your export. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing your export. Check the record before repeating the action.

**followUp:** Shall we review reports and exports and check the next safe step?


## reports.queue.started

- Module: reports
- Trigger: Use the permission-checked reports.queue workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** Queueing the report job…

**friendly:** Let me take care of this step: queueing the report job.

**detailed:** I'm working on this request: queueing the report job.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## reports.queue.completed

- Module: reports
- Trigger: Use the permission-checked reports.queue workflow. The authoritative backend confirms the exact result described: Your report job has been queued. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** Your report job has been queued.

**friendly:** Your report is in the queue. I'll show the result once processing is confirmed.

**detailed:** Your report job has been queued.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in reports and exports?


## reports.queue.failed

- Module: reports
- Trigger: Use the permission-checked reports.queue workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / saved, bell, activity, companion
- Dynamic variables: record_label
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** I couldn't confirm the result: queueing the report job.

**friendly:** I noticed a problem while queueing the report job. Shall we review the details?

**detailed:** This request needs review: queueing the report job. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: queueing the report job. Check the record before repeating the action.

**followUp:** Shall we review reports and exports and check the next safe step?


## reports.download.started

- Module: reports
- Trigger: Use the permission-checked reports.download workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** Preparing the report download…

**friendly:** Preparing the report download. You can keep working while it runs.

**detailed:** I'm working on this request: preparing the report download.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## reports.download.completed

- Module: reports
- Trigger: Use the permission-checked reports.download workflow. The authoritative backend confirms the exact result described: The report file is ready for download. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** The report file is ready for download.

**friendly:** Your report file is ready. The browser will handle the download.

**detailed:** The report file is ready for download.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in reports and exports?


## reports.download.failed

- Module: reports
- Trigger: Use the permission-checked reports.download workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / saved, bell, activity, companion
- Dynamic variables: record_label
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** I couldn't confirm the result: preparing the report download.

**friendly:** That step needs a closer look: preparing the report download. Let's check the saved record first.

**detailed:** This request needs review: preparing the report download. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the report download. Check the record before repeating the action.

**followUp:** Shall we review reports and exports and check the next safe step?


## reports.reconcile.started

- Module: reports
- Trigger: Use the permission-checked reports.reconcile workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** Reconciling payment records…

**friendly:** Reconciling payment records. You can keep working while it runs.

**detailed:** I'm working on this request: reconciling payment records.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## reports.reconcile.completed

- Module: reports
- Trigger: Use the permission-checked reports.reconcile workflow. The authoritative backend confirms the exact result described: The payment reconciliation result is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** The payment reconciliation result is ready.

**friendly:** Your payment reconciliation is ready. Let's review any differences.

**detailed:** The payment reconciliation result is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in reports and exports?


## reports.reconcile.failed

- Module: reports
- Trigger: Use the permission-checked reports.reconcile workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / saved, bell, activity, companion
- Dynamic variables: record_label
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** I couldn't confirm the result: reconciling payment records.

**friendly:** That step needs a closer look: reconciling payment records. Let's check the saved record first.

**detailed:** This request needs review: reconciling payment records. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: reconciling payment records. Check the record before repeating the action.

**followUp:** Shall we review reports and exports and check the next safe step?


## customers.create.started

- Module: customers
- Trigger: Use the permission-checked customers.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** Saving the new customer…

**friendly:** This request is in progress: saving the new customer. I'll wait for its confirmed result.

**detailed:** I'm working on this request: saving the new customer.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## customers.create.completed

- Module: customers
- Trigger: Use the permission-checked customers.create workflow. The authoritative backend confirms the exact result described: The customer record has been created. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** The customer record has been created.

**friendly:** Your new customer is saved. You can review their details now.

**detailed:** The customer record has been created.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in customers and customer events?


## customers.create.failed

- Module: customers
- Trigger: Use the permission-checked customers.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** I couldn't confirm the result: saving the new customer.

**friendly:** Something interrupted saving the new customer. Please review the record before repeating it.

**detailed:** This request needs review: saving the new customer. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the new customer. Check the record before repeating the action.

**followUp:** Shall we review customers and customer events and check the next safe step?


## customers.update.started

- Module: customers
- Trigger: Use the permission-checked customers.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** Updating customer details…

**friendly:** Let me take care of this step: updating customer details.

**detailed:** I'm working on this request: updating customer details.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## customers.update.completed

- Module: customers
- Trigger: Use the permission-checked customers.update workflow. The authoritative backend confirms the exact result described: The customer details have been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** The customer details have been updated.

**friendly:** Those customer details are saved and ready to use.

**detailed:** The customer details have been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in customers and customer events?


## customers.update.failed

- Module: customers
- Trigger: Use the permission-checked customers.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** I couldn't confirm the result: updating customer details.

**friendly:** I noticed a problem while updating customer details. Shall we review the details?

**detailed:** This request needs review: updating customer details. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating customer details. Check the record before repeating the action.

**followUp:** Shall we review customers and customer events and check the next safe step?


## customers.delete.started

- Module: customers
- Trigger: Use the permission-checked customers.delete workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** Removing the customer record…

**friendly:** Let me take care of this step: removing the customer record.

**detailed:** I'm working on this request: removing the customer record.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## customers.delete.completed

- Module: customers
- Trigger: Use the permission-checked customers.delete workflow. The authoritative backend confirms the exact result described: The selected customer record has been removed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** The selected customer record has been removed.

**friendly:** The customer record has been removed as requested.

**detailed:** The selected customer record has been removed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in customers and customer events?


## customers.delete.failed

- Module: customers
- Trigger: Use the permission-checked customers.delete workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** I couldn't confirm the result: removing the customer record.

**friendly:** I noticed a problem while removing the customer record. Shall we review the details?

**detailed:** This request needs review: removing the customer record. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: removing the customer record. Check the record before repeating the action.

**followUp:** Shall we review customers and customer events and check the next safe step?


## customers.merge.started

- Module: customers
- Trigger: Use the permission-checked customers.merge workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** Merging customer records…

**friendly:** This request is in progress: merging customer records. I'll wait for its confirmed result.

**detailed:** I'm working on this request: merging customer records.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## customers.merge.completed

- Module: customers
- Trigger: Use the permission-checked customers.merge workflow. The authoritative backend confirms the exact result described: The customer records have been merged. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** The customer records have been merged.

**friendly:** The customer merge is confirmed. Please review the combined record.

**detailed:** The customer records have been merged.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in customers and customer events?


## customers.merge.failed

- Module: customers
- Trigger: Use the permission-checked customers.merge workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** I couldn't confirm the result: merging customer records.

**friendly:** Something interrupted merging customer records. Please review the record before repeating it.

**detailed:** This request needs review: merging customer records. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: merging customer records. Check the record before repeating the action.

**followUp:** Shall we review customers and customer events and check the next safe step?


## customers.export.started

- Module: customers
- Trigger: Use the permission-checked customers.export workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** Preparing the customer export…

**friendly:** Preparing the customer export. You can keep working while it runs.

**detailed:** I'm working on this request: preparing the customer export.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## customers.export.completed

- Module: customers
- Trigger: Use the permission-checked customers.export workflow. The authoritative backend confirms the exact result described: Your customer export is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** Your customer export is ready.

**friendly:** Your customer export is ready to download.

**detailed:** Your customer export is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in customers and customer events?


## customers.export.failed

- Module: customers
- Trigger: Use the permission-checked customers.export workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** I couldn't confirm the result: preparing the customer export.

**friendly:** That step needs a closer look: preparing the customer export. Let's check the saved record first.

**detailed:** This request needs review: preparing the customer export. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the customer export. Check the record before repeating the action.

**followUp:** Shall we review customers and customer events and check the next safe step?


## customers.event_contact.started

- Module: customers
- Trigger: Use the permission-checked customers.event contact workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** Preparing the customer contact link…

**friendly:** I'm preparing the customer contact link. I'll share the confirmed result.

**detailed:** I'm working on this request: preparing the customer contact link.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## customers.event_contact.completed

- Module: customers
- Trigger: Use the permission-checked customers.event contact workflow. The authoritative backend confirms the exact result described: The customer contact link is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** The customer contact link is ready.

**friendly:** The contact link is ready. You'll choose whether to send a message.

**detailed:** The customer contact link is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in customers and customer events?


## customers.event_contact.failed

- Module: customers
- Trigger: Use the permission-checked customers.event contact workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Customers (/customers; customers:view)
- Sources: app/(dashboard)/customers/actions.ts

**short:** I couldn't confirm the result: preparing the customer contact link.

**friendly:** I couldn't finish preparing the customer contact link. Shall we check the existing record before trying again?

**detailed:** This request needs review: preparing the customer contact link. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the customer contact link. Check the record before repeating the action.

**followUp:** Shall we review customers and customer events and check the next safe step?


## integrations.connect.started

- Module: integrations
- Trigger: Use the permission-checked integrations.connect workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** Connecting the integration…

**friendly:** This request is in progress: connecting the integration. I'll wait for its confirmed result.

**detailed:** I'm working on this request: connecting the integration.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## integrations.connect.completed

- Module: integrations
- Trigger: Use the permission-checked integrations.connect workflow. The authoritative backend confirms the exact result described: The integration connection has been confirmed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** The integration connection has been confirmed.

**friendly:** You're connected. Let's check the integration's available features.

**detailed:** The integration connection has been confirmed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in integrations and background jobs?


## integrations.connect.failed

- Module: integrations
- Trigger: Use the permission-checked integrations.connect workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, activity, companion
- Dynamic variables: record_label
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** I couldn't confirm the result: connecting the integration.

**friendly:** Something interrupted connecting the integration. Please review the record before repeating it.

**detailed:** This request needs review: connecting the integration. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: connecting the integration. Check the record before repeating the action.

**followUp:** Shall we review integrations and background jobs and check the next safe step?


## integrations.disconnect.started

- Module: integrations
- Trigger: Use the permission-checked integrations.disconnect workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** Disconnecting the integration…

**friendly:** This request is in progress: disconnecting the integration. I'll wait for its confirmed result.

**detailed:** I'm working on this request: disconnecting the integration.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## integrations.disconnect.completed

- Module: integrations
- Trigger: Use the permission-checked integrations.disconnect workflow. The authoritative backend confirms the exact result described: The integration has been disconnected. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** The integration has been disconnected.

**friendly:** The integration is disconnected as requested.

**detailed:** The integration has been disconnected.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in integrations and background jobs?


## integrations.disconnect.failed

- Module: integrations
- Trigger: Use the permission-checked integrations.disconnect workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, activity, companion
- Dynamic variables: record_label
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** I couldn't confirm the result: disconnecting the integration.

**friendly:** Something interrupted disconnecting the integration. Please review the record before repeating it.

**detailed:** This request needs review: disconnecting the integration. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: disconnecting the integration. Check the record before repeating the action.

**followUp:** Shall we review integrations and background jobs and check the next safe step?


## integrations.sync.started

- Module: integrations
- Trigger: Use the permission-checked integrations.sync workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** Synchronising integration data…

**friendly:** Let me take care of this step: synchronising integration data.

**detailed:** I'm working on this request: synchronising integration data.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## integrations.sync.completed

- Module: integrations
- Trigger: Use the permission-checked integrations.sync workflow. The authoritative backend confirms the exact result described: The integration sync has completed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** The integration sync has completed.

**friendly:** Your integration sync is complete. The latest result is ready to review.

**detailed:** The integration sync has completed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in integrations and background jobs?


## integrations.sync.failed

- Module: integrations
- Trigger: Use the permission-checked integrations.sync workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, activity, companion
- Dynamic variables: record_label
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** I couldn't confirm the result: synchronising integration data.

**friendly:** I noticed a problem while synchronising integration data. Shall we review the details?

**detailed:** This request needs review: synchronising integration data. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: synchronising integration data. Check the record before repeating the action.

**followUp:** Shall we review integrations and background jobs and check the next safe step?


## integrations.job.started

- Module: integrations
- Trigger: Use the permission-checked integrations.job workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** Processing the background job…

**friendly:** I'm processing the background job. I'll share the confirmed result.

**detailed:** I'm working on this request: processing the background job.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## integrations.job.completed

- Module: integrations
- Trigger: Use the permission-checked integrations.job workflow. The authoritative backend confirms the exact result described: The background job has completed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** The background job has completed.

**friendly:** The background work is complete. You can review its result now.

**detailed:** The background job has completed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in integrations and background jobs?


## integrations.job.failed

- Module: integrations
- Trigger: Use the permission-checked integrations.job workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, activity, companion
- Dynamic variables: record_label
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** I couldn't confirm the result: processing the background job.

**friendly:** I couldn't finish processing the background job. Shall we check the existing record before trying again?

**detailed:** This request needs review: processing the background job. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: processing the background job. Check the record before repeating the action.

**followUp:** Shall we review integrations and background jobs and check the next safe step?


## integrations.schedule.started

- Module: integrations
- Trigger: Use the permission-checked integrations.schedule workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** Saving the schedule…

**friendly:** Let me take care of this step: saving the schedule.

**detailed:** I'm working on this request: saving the schedule.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## integrations.schedule.completed

- Module: integrations
- Trigger: Use the permission-checked integrations.schedule workflow. The authoritative backend confirms the exact result described: The operation schedule has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The operation schedule has been saved.

**friendly:** Your schedule is saved. It follows the existing automation settings.

**detailed:** The operation schedule has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in integrations and background jobs?


## integrations.schedule.failed

- Module: integrations
- Trigger: Use the permission-checked integrations.schedule workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** I couldn't confirm the result: saving the schedule.

**friendly:** I noticed a problem while saving the schedule. Shall we review the details?

**detailed:** This request needs review: saving the schedule. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the schedule. Check the record before repeating the action.

**followUp:** Shall we review integrations and background jobs and check the next safe step?


## settings.update.started

- Module: settings
- Trigger: Use the permission-checked settings.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Saving your ERP settings…

**friendly:** Let me take care of this step: saving your erp settings.

**detailed:** I'm working on this request: saving your erp settings.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## settings.update.completed

- Module: settings
- Trigger: Use the permission-checked settings.update workflow. The authoritative backend confirms the exact result described: Your ERP settings have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Your ERP settings have been saved.

**friendly:** Your settings are saved. Everything is ready for your next step.

**detailed:** Your ERP settings have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in erp settings?


## settings.update.failed

- Module: settings
- Trigger: Use the permission-checked settings.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** I couldn't confirm the result: saving your erp settings.

**friendly:** I noticed a problem while saving your erp settings. Shall we review the details?

**detailed:** This request needs review: saving your erp settings. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving your erp settings. Check the record before repeating the action.

**followUp:** Shall we review erp settings and check the next safe step?


## settings.companion.started

- Module: settings
- Trigger: Use the permission-checked settings.companion workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Saving Khyra preferences…

**friendly:** This request is in progress: saving khyra preferences. I'll wait for its confirmed result.

**detailed:** I'm working on this request: saving khyra preferences.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## settings.companion.completed

- Module: settings
- Trigger: Use the permission-checked settings.companion workflow. The authoritative backend confirms the exact result described: Your Khyra preferences have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Your Khyra preferences have been saved.

**friendly:** Your preferences are saved. I'll follow the way you like to work.

**detailed:** Your Khyra preferences have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in erp settings?


## settings.companion.failed

- Module: settings
- Trigger: Use the permission-checked settings.companion workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** I couldn't confirm the result: saving khyra preferences.

**friendly:** Something interrupted saving khyra preferences. Please review the record before repeating it.

**detailed:** This request needs review: saving khyra preferences. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving khyra preferences. Check the record before repeating the action.

**followUp:** Shall we review erp settings and check the next safe step?


## settings.currency.started

- Module: settings
- Trigger: Use the permission-checked settings.currency workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Saving currency rates…

**friendly:** Let me take care of this step: saving currency rates.

**detailed:** I'm working on this request: saving currency rates.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## settings.currency.completed

- Module: settings
- Trigger: Use the permission-checked settings.currency workflow. The authoritative backend confirms the exact result described: The currency rates have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** The currency rates have been saved.

**friendly:** Your entered currency rates are saved. You can review their effective values.

**detailed:** The currency rates have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in erp settings?


## settings.currency.failed

- Module: settings
- Trigger: Use the permission-checked settings.currency workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** I couldn't confirm the result: saving currency rates.

**friendly:** I noticed a problem while saving currency rates. Shall we review the details?

**detailed:** This request needs review: saving currency rates. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving currency rates. Check the record before repeating the action.

**followUp:** Shall we review erp settings and check the next safe step?


## settings.marketplace_profile.started

- Module: settings
- Trigger: Use the permission-checked settings.marketplace profile workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Saving the marketplace pricing profile…

**friendly:** I'm saving the marketplace pricing profile. I'll share the confirmed result.

**detailed:** I'm working on this request: saving the marketplace pricing profile.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## settings.marketplace_profile.completed

- Module: settings
- Trigger: Use the permission-checked settings.marketplace profile workflow. The authoritative backend confirms the exact result described: The marketplace pricing profile has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** The marketplace pricing profile has been saved.

**friendly:** Your marketplace pricing profile is saved for review.

**detailed:** The marketplace pricing profile has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in erp settings?


## settings.marketplace_profile.failed

- Module: settings
- Trigger: Use the permission-checked settings.marketplace profile workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** I couldn't confirm the result: saving the marketplace pricing profile.

**friendly:** I couldn't finish saving the marketplace pricing profile. Shall we check the existing record before trying again?

**detailed:** This request needs review: saving the marketplace pricing profile. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the marketplace pricing profile. Check the record before repeating the action.

**followUp:** Shall we review erp settings and check the next safe step?


## settings.marketplace_profile_copy.started

- Module: settings
- Trigger: Use the permission-checked settings.marketplace profile copy workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Copying the marketplace profile…

**friendly:** Let me take care of this step: copying the marketplace profile.

**detailed:** I'm working on this request: copying the marketplace profile.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## settings.marketplace_profile_copy.completed

- Module: settings
- Trigger: Use the permission-checked settings.marketplace profile copy workflow. The authoritative backend confirms the exact result described: The marketplace profile has been copied. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** The marketplace profile has been copied.

**friendly:** Your copied marketplace profile is ready to customise.

**detailed:** The marketplace profile has been copied.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in erp settings?


## settings.marketplace_profile_copy.failed

- Module: settings
- Trigger: Use the permission-checked settings.marketplace profile copy workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** I couldn't confirm the result: copying the marketplace profile.

**friendly:** I noticed a problem while copying the marketplace profile. Shall we review the details?

**detailed:** This request needs review: copying the marketplace profile. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: copying the marketplace profile. Check the record before repeating the action.

**followUp:** Shall we review erp settings and check the next safe step?


## settings.import.started

- Module: settings
- Trigger: Use the permission-checked settings.import workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Importing ERP settings…

**friendly:** Let me take care of this step: importing erp settings.

**detailed:** I'm working on this request: importing erp settings.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## settings.import.completed

- Module: settings
- Trigger: Use the permission-checked settings.import workflow. The authoritative backend confirms the exact result described: The settings import has completed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** The settings import has completed.

**friendly:** Your imported settings are saved. Please review them before using the configuration.

**detailed:** The settings import has completed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in erp settings?


## settings.import.failed

- Module: settings
- Trigger: Use the permission-checked settings.import workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** I couldn't confirm the result: importing erp settings.

**friendly:** I noticed a problem while importing erp settings. Shall we review the details?

**detailed:** This request needs review: importing erp settings. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: importing erp settings. Check the record before repeating the action.

**followUp:** Shall we review erp settings and check the next safe step?


## settings.export.started

- Module: settings
- Trigger: Use the permission-checked settings.export workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Preparing the settings export…

**friendly:** Preparing the settings export. You can keep working while it runs.

**detailed:** I'm working on this request: preparing the settings export.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## settings.export.completed

- Module: settings
- Trigger: Use the permission-checked settings.export workflow. The authoritative backend confirms the exact result described: The settings export is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** The settings export is ready.

**friendly:** Your settings export is ready. Keep the file somewhere appropriate.

**detailed:** The settings export is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in erp settings?


## settings.export.failed

- Module: settings
- Trigger: Use the permission-checked settings.export workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** I couldn't confirm the result: preparing the settings export.

**friendly:** That step needs a closer look: preparing the settings export. Let's check the saved record first.

**detailed:** This request needs review: preparing the settings export. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the settings export. Check the record before repeating the action.

**followUp:** Shall we review erp settings and check the next safe step?


## settings.invoice.started

- Module: settings
- Trigger: Use the permission-checked settings.invoice workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Saving invoice settings…

**friendly:** I'm saving invoice settings. I'll share the confirmed result.

**detailed:** I'm working on this request: saving invoice settings.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## settings.invoice.completed

- Module: settings
- Trigger: Use the permission-checked settings.invoice workflow. The authoritative backend confirms the exact result described: Your invoice settings have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Your invoice settings have been saved.

**friendly:** Your invoice preferences are saved for future documents.

**detailed:** Your invoice settings have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in erp settings?


## settings.invoice.failed

- Module: settings
- Trigger: Use the permission-checked settings.invoice workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** I couldn't confirm the result: saving invoice settings.

**friendly:** I couldn't finish saving invoice settings. Shall we check the existing record before trying again?

**detailed:** This request needs review: saving invoice settings. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving invoice settings. Check the record before repeating the action.

**followUp:** Shall we review erp settings and check the next safe step?


## settings.customer.started

- Module: settings
- Trigger: Use the permission-checked settings.customer workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Saving customer settings…

**friendly:** Saving customer settings. You can keep working while it runs.

**detailed:** I'm working on this request: saving customer settings.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## settings.customer.completed

- Module: settings
- Trigger: Use the permission-checked settings.customer workflow. The authoritative backend confirms the exact result described: The customer settings have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** The customer settings have been saved.

**friendly:** Your customer settings are saved and ready to review.

**detailed:** The customer settings have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in erp settings?


## settings.customer.failed

- Module: settings
- Trigger: Use the permission-checked settings.customer workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** I couldn't confirm the result: saving customer settings.

**friendly:** That step needs a closer look: saving customer settings. Let's check the saved record first.

**detailed:** This request needs review: saving customer settings. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving customer settings. Check the record before repeating the action.

**followUp:** Shall we review erp settings and check the next safe step?


## settings.category_images.started

- Module: settings
- Trigger: Use the permission-checked settings.category images workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** Saving category images…

**friendly:** Let me take care of this step: saving category images.

**detailed:** I'm working on this request: saving category images.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## settings.category_images.completed

- Module: settings
- Trigger: Use the permission-checked settings.category images workflow. The authoritative backend confirms the exact result described: The category images have been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** The category images have been updated.

**friendly:** Your category images are saved. Shall we review their appearance?

**detailed:** The category images have been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in erp settings?


## settings.category_images.failed

- Module: settings
- Trigger: Use the permission-checked settings.category images workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Settings (/settings; settings:manage)
- Sources: app/(dashboard)/settings/actions.ts

**short:** I couldn't confirm the result: saving category images.

**friendly:** I noticed a problem while saving category images. Shall we review the details?

**detailed:** This request needs review: saving category images. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving category images. Check the record before repeating the action.

**followUp:** Shall we review erp settings and check the next safe step?


## security.password.started

- Module: security
- Trigger: Use the permission-checked security.password workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Updating your password…

**friendly:** Updating your password. You can keep working while it runs.

**detailed:** I'm working on this request: updating your password.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## security.password.completed

- Module: security
- Trigger: Use the permission-checked security.password workflow. The authoritative backend confirms the exact result described: Your password has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Your password has been updated.

**friendly:** Your password change is confirmed. Keep your sign-in details private.

**detailed:** Your password has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in security and sessions?


## security.password.failed

- Module: security
- Trigger: Use the permission-checked security.password workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** I couldn't confirm the result: updating your password.

**friendly:** That step needs a closer look: updating your password. Let's check the saved record first.

**detailed:** This request needs review: updating your password. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating your password. Check the record before repeating the action.

**followUp:** Shall we review security and sessions and check the next safe step?


## security.authenticator.started

- Module: security
- Trigger: Use the permission-checked security.authenticator workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Updating authenticator protection…

**friendly:** Updating authenticator protection. You can keep working while it runs.

**detailed:** I'm working on this request: updating authenticator protection.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## security.authenticator.completed

- Module: security
- Trigger: Use the permission-checked security.authenticator workflow. The authoritative backend confirms the exact result described: Your authenticator setting has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Your authenticator setting has been updated.

**friendly:** Your authenticator setting is saved. Please review your recovery options.

**detailed:** Your authenticator setting has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in security and sessions?


## security.authenticator.failed

- Module: security
- Trigger: Use the permission-checked security.authenticator workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** I couldn't confirm the result: updating authenticator protection.

**friendly:** That step needs a closer look: updating authenticator protection. Let's check the saved record first.

**detailed:** This request needs review: updating authenticator protection. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating authenticator protection. Check the record before repeating the action.

**followUp:** Shall we review security and sessions and check the next safe step?


## security.recovery.started

- Module: security
- Trigger: Use the permission-checked security.recovery workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Preparing recovery codes…

**friendly:** Preparing recovery codes. You can keep working while it runs.

**detailed:** I'm working on this request: preparing recovery codes.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## security.recovery.completed

- Module: security
- Trigger: Use the permission-checked security.recovery workflow. The authoritative backend confirms the exact result described: Your recovery codes are ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Your recovery codes are ready.

**friendly:** Your recovery codes are ready. Store them securely using the existing recovery screen.

**detailed:** Your recovery codes are ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in security and sessions?


## security.recovery.failed

- Module: security
- Trigger: Use the permission-checked security.recovery workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** I couldn't confirm the result: preparing recovery codes.

**friendly:** That step needs a closer look: preparing recovery codes. Let's check the saved record first.

**detailed:** This request needs review: preparing recovery codes. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing recovery codes. Check the record before repeating the action.

**followUp:** Shall we review security and sessions and check the next safe step?


## security.passkey.started

- Module: security
- Trigger: Use the permission-checked security.passkey workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Registering your passkey…

**friendly:** Let me take care of this step: registering your passkey.

**detailed:** I'm working on this request: registering your passkey.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## security.passkey.completed

- Module: security
- Trigger: Use the permission-checked security.passkey workflow. The authoritative backend confirms the exact result described: Your passkey has been registered. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Your passkey has been registered.

**friendly:** Your passkey is ready for future sign-ins on supported devices.

**detailed:** Your passkey has been registered.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in security and sessions?


## security.passkey.failed

- Module: security
- Trigger: Use the permission-checked security.passkey workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** I couldn't confirm the result: registering your passkey.

**friendly:** I noticed a problem while registering your passkey. Shall we review the details?

**detailed:** This request needs review: registering your passkey. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: registering your passkey. Check the record before repeating the action.

**followUp:** Shall we review security and sessions and check the next safe step?


## security.session_revoke.started

- Module: security
- Trigger: Use the permission-checked security.session revoke workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Revoking the selected session…

**friendly:** Revoking the selected session. You can keep working while it runs.

**detailed:** I'm working on this request: revoking the selected session.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## security.session_revoke.completed

- Module: security
- Trigger: Use the permission-checked security.session revoke workflow. The authoritative backend confirms the exact result described: The selected session has been revoked. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** The selected session has been revoked.

**friendly:** That session has been signed out. Your current session follows the existing security rules.

**detailed:** The selected session has been revoked.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in security and sessions?


## security.session_revoke.failed

- Module: security
- Trigger: Use the permission-checked security.session revoke workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** I couldn't confirm the result: revoking the selected session.

**friendly:** That step needs a closer look: revoking the selected session. Let's check the saved record first.

**detailed:** This request needs review: revoking the selected session. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: revoking the selected session. Check the record before repeating the action.

**followUp:** Shall we review security and sessions and check the next safe step?


## security.app_lock.started

- Module: security
- Trigger: Use the permission-checked security.app lock workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Updating app-lock preferences…

**friendly:** This request is in progress: updating app-lock preferences. I'll wait for its confirmed result.

**detailed:** I'm working on this request: updating app-lock preferences.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## security.app_lock.completed

- Module: security
- Trigger: Use the permission-checked security.app lock workflow. The authoritative backend confirms the exact result described: Your app-lock preferences have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Your app-lock preferences have been saved.

**friendly:** Your app-lock settings are saved. I'll respect the existing lock and grace behaviour.

**detailed:** Your app-lock preferences have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in security and sessions?


## security.app_lock.failed

- Module: security
- Trigger: Use the permission-checked security.app lock workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** I couldn't confirm the result: updating app-lock preferences.

**friendly:** Something interrupted updating app-lock preferences. Please review the record before repeating it.

**detailed:** This request needs review: updating app-lock preferences. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating app-lock preferences. Check the record before repeating the action.

**followUp:** Shall we review security and sessions and check the next safe step?


## users.create.started

- Module: users
- Trigger: Use the permission-checked users.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review User administration (/users; users:manage)
- Sources: app/(dashboard)/users/actions.ts

**short:** Creating the user account…

**friendly:** I'm creating the user account. I'll share the confirmed result.

**detailed:** I'm working on this request: creating the user account.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## users.create.completed

- Module: users
- Trigger: Use the permission-checked users.create workflow. The authoritative backend confirms the exact result described: The user account has been created. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review User administration (/users; users:manage)
- Sources: app/(dashboard)/users/actions.ts

**short:** The user account has been created.

**friendly:** The new account is saved. Please review its assigned access.

**detailed:** The user account has been created.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in user administration?


## users.create.failed

- Module: users
- Trigger: Use the permission-checked users.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review User administration (/users; users:manage)
- Sources: app/(dashboard)/users/actions.ts

**short:** I couldn't confirm the result: creating the user account.

**friendly:** I couldn't finish creating the user account. Shall we check the existing record before trying again?

**detailed:** This request needs review: creating the user account. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: creating the user account. Check the record before repeating the action.

**followUp:** Shall we review user administration and check the next safe step?


## users.update.started

- Module: users
- Trigger: Use the permission-checked users.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review User administration (/users; users:manage)
- Sources: app/(dashboard)/users/actions.ts

**short:** Updating the user account…

**friendly:** This request is in progress: updating the user account. I'll wait for its confirmed result.

**detailed:** I'm working on this request: updating the user account.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## users.update.completed

- Module: users
- Trigger: Use the permission-checked users.update workflow. The authoritative backend confirms the exact result described: The user account has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review User administration (/users; users:manage)
- Sources: app/(dashboard)/users/actions.ts

**short:** The user account has been updated.

**friendly:** Those account details are saved. You can review the user's access now.

**detailed:** The user account has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in user administration?


## users.update.failed

- Module: users
- Trigger: Use the permission-checked users.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review User administration (/users; users:manage)
- Sources: app/(dashboard)/users/actions.ts

**short:** I couldn't confirm the result: updating the user account.

**friendly:** Something interrupted updating the user account. Please review the record before repeating it.

**detailed:** This request needs review: updating the user account. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating the user account. Check the record before repeating the action.

**followUp:** Shall we review user administration and check the next safe step?


## users.delete.started

- Module: users
- Trigger: Use the permission-checked users.delete workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review User administration (/users; users:manage)
- Sources: app/(dashboard)/users/actions.ts

**short:** Removing the user account…

**friendly:** This request is in progress: removing the user account. I'll wait for its confirmed result.

**detailed:** I'm working on this request: removing the user account.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## users.delete.completed

- Module: users
- Trigger: Use the permission-checked users.delete workflow. The authoritative backend confirms the exact result described: The user account has been removed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review User administration (/users; users:manage)
- Sources: app/(dashboard)/users/actions.ts

**short:** The user account has been removed.

**friendly:** The selected account has been removed as requested.

**detailed:** The user account has been removed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in user administration?


## users.delete.failed

- Module: users
- Trigger: Use the permission-checked users.delete workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review User administration (/users; users:manage)
- Sources: app/(dashboard)/users/actions.ts

**short:** I couldn't confirm the result: removing the user account.

**friendly:** Something interrupted removing the user account. Please review the record before repeating it.

**detailed:** This request needs review: removing the user account. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: removing the user account. Check the record before repeating the action.

**followUp:** Shall we review user administration and check the next safe step?


## roles.update.started

- Module: roles
- Trigger: Use the permission-checked roles.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Roles and permissions (/users; users:manage)
- Sources: app/api/roles/route.ts

**short:** Saving role permissions…

**friendly:** Let me take care of this step: saving role permissions.

**detailed:** I'm working on this request: saving role permissions.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## roles.update.completed

- Module: roles
- Trigger: Use the permission-checked roles.update workflow. The authoritative backend confirms the exact result described: The role permissions have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Roles and permissions (/users; users:manage)
- Sources: app/api/roles/route.ts

**short:** The role permissions have been saved.

**friendly:** Your role permissions are saved. Let's check the intended access.

**detailed:** The role permissions have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in roles and permissions?


## roles.update.failed

- Module: roles
- Trigger: Use the permission-checked roles.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Roles and permissions (/users; users:manage)
- Sources: app/api/roles/route.ts

**short:** I couldn't confirm the result: saving role permissions.

**friendly:** I noticed a problem while saving role permissions. Shall we review the details?

**detailed:** This request needs review: saving role permissions. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving role permissions. Check the record before repeating the action.

**followUp:** Shall we review roles and permissions and check the next safe step?


## roles.create.started

- Module: roles
- Trigger: Use the permission-checked roles.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** Creating the role…

**friendly:** This request is in progress: creating the role. I'll wait for its confirmed result.

**detailed:** I'm working on this request: creating the role.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## roles.create.completed

- Module: roles
- Trigger: Use the permission-checked roles.create workflow. The authoritative backend confirms the exact result described: The role has been created. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The role has been created.

**friendly:** Your new role is ready for a permission review.

**detailed:** The role has been created.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in roles and permissions?


## roles.create.failed

- Module: roles
- Trigger: Use the permission-checked roles.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** I couldn't confirm the result: creating the role.

**friendly:** Something interrupted creating the role. Please review the record before repeating it.

**detailed:** This request needs review: creating the role. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: creating the role. Check the record before repeating the action.

**followUp:** Shall we review roles and permissions and check the next safe step?


## notes.create.started

- Module: notes
- Trigger: Use the permission-checked notes.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Saving your note…

**friendly:** This request is in progress: saving your note. I'll wait for its confirmed result.

**detailed:** I'm working on this request: saving your note.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## notes.create.completed

- Module: notes
- Trigger: Use the permission-checked notes.create workflow. The authoritative backend confirms the exact result described: Your note has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Your note has been saved.

**friendly:** Your note is saved. It'll be here when you need it.

**detailed:** Your note has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in notes and checklists?


## notes.create.failed

- Module: notes
- Trigger: Use the permission-checked notes.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** I couldn't confirm the result: saving your note.

**friendly:** Something interrupted saving your note. Please review the record before repeating it.

**detailed:** This request needs review: saving your note. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving your note. Check the record before repeating the action.

**followUp:** Shall we review notes and checklists and check the next safe step?


## notes.update.started

- Module: notes
- Trigger: Use the permission-checked notes.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Updating your note…

**friendly:** Let me take care of this step: updating your note.

**detailed:** I'm working on this request: updating your note.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## notes.update.completed

- Module: notes
- Trigger: Use the permission-checked notes.update workflow. The authoritative backend confirms the exact result described: Your note has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Your note has been updated.

**friendly:** Your changes are saved. Shall we keep going?

**detailed:** Your note has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in notes and checklists?


## notes.update.failed

- Module: notes
- Trigger: Use the permission-checked notes.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** I couldn't confirm the result: updating your note.

**friendly:** I noticed a problem while updating your note. Shall we review the details?

**detailed:** This request needs review: updating your note. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating your note. Check the record before repeating the action.

**followUp:** Shall we review notes and checklists and check the next safe step?


## notes.delete.started

- Module: notes
- Trigger: Use the permission-checked notes.delete workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Moving the note to trash…

**friendly:** Let me take care of this step: moving the note to trash.

**detailed:** I'm working on this request: moving the note to trash.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## notes.delete.completed

- Module: notes
- Trigger: Use the permission-checked notes.delete workflow. The authoritative backend confirms the exact result described: Your note has been moved to trash. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Your note has been moved to trash.

**friendly:** Your note is in the trash. Use the existing note controls to manage it.

**detailed:** Your note has been moved to trash.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in notes and checklists?


## notes.delete.failed

- Module: notes
- Trigger: Use the permission-checked notes.delete workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** I couldn't confirm the result: moving the note to trash.

**friendly:** I noticed a problem while moving the note to trash. Shall we review the details?

**detailed:** This request needs review: moving the note to trash. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: moving the note to trash. Check the record before repeating the action.

**followUp:** Shall we review notes and checklists and check the next safe step?


## notes.restore.started

- Module: notes
- Trigger: Use the permission-checked notes.restore workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Restoring your note…

**friendly:** This request is in progress: restoring your note. I'll wait for its confirmed result.

**detailed:** I'm working on this request: restoring your note.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## notes.restore.completed

- Module: notes
- Trigger: Use the permission-checked notes.restore workflow. The authoritative backend confirms the exact result described: Your note has been restored. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Your note has been restored.

**friendly:** Your note is back and ready to use.

**detailed:** Your note has been restored.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in notes and checklists?


## notes.restore.failed

- Module: notes
- Trigger: Use the permission-checked notes.restore workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** I couldn't confirm the result: restoring your note.

**friendly:** Something interrupted restoring your note. Please review the record before repeating it.

**detailed:** This request needs review: restoring your note. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: restoring your note. Check the record before repeating the action.

**followUp:** Shall we review notes and checklists and check the next safe step?


## notes.archive.started

- Module: notes
- Trigger: Use the permission-checked notes.archive workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Archiving your note…

**friendly:** Archiving your note. You can keep working while it runs.

**detailed:** I'm working on this request: archiving your note.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## notes.archive.completed

- Module: notes
- Trigger: Use the permission-checked notes.archive workflow. The authoritative backend confirms the exact result described: Your note has been archived. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Your note has been archived.

**friendly:** Your note is archived, keeping your active workspace a little clearer.

**detailed:** Your note has been archived.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in notes and checklists?


## notes.archive.failed

- Module: notes
- Trigger: Use the permission-checked notes.archive workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** I couldn't confirm the result: archiving your note.

**friendly:** That step needs a closer look: archiving your note. Let's check the saved record first.

**detailed:** This request needs review: archiving your note. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: archiving your note. Check the record before repeating the action.

**followUp:** Shall we review notes and checklists and check the next safe step?


## notes.pin.started

- Module: notes
- Trigger: Use the permission-checked notes.pin workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Saving the note pin…

**friendly:** Let me take care of this step: saving the note pin.

**detailed:** I'm working on this request: saving the note pin.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## notes.pin.completed

- Module: notes
- Trigger: Use the permission-checked notes.pin workflow. The authoritative backend confirms the exact result described: Your note pin has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Your note pin has been saved.

**friendly:** Your pin preference is saved. That note is easier to find now.

**detailed:** Your note pin has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in notes and checklists?


## notes.pin.failed

- Module: notes
- Trigger: Use the permission-checked notes.pin workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** I couldn't confirm the result: saving the note pin.

**friendly:** I noticed a problem while saving the note pin. Shall we review the details?

**detailed:** This request needs review: saving the note pin. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the note pin. Check the record before repeating the action.

**followUp:** Shall we review notes and checklists and check the next safe step?


## notes.share.started

- Module: notes
- Trigger: Use the permission-checked notes.share workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Updating note sharing…

**friendly:** Let me take care of this step: updating note sharing.

**detailed:** I'm working on this request: updating note sharing.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## notes.share.completed

- Module: notes
- Trigger: Use the permission-checked notes.share workflow. The authoritative backend confirms the exact result described: The note-sharing setting has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** The note-sharing setting has been saved.

**friendly:** The sharing setting is saved. Please review who can access the shared link.

**detailed:** The note-sharing setting has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in notes and checklists?


## notes.share.failed

- Module: notes
- Trigger: Use the permission-checked notes.share workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** I couldn't confirm the result: updating note sharing.

**friendly:** I noticed a problem while updating note sharing. Shall we review the details?

**detailed:** This request needs review: updating note sharing. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating note sharing. Check the record before repeating the action.

**followUp:** Shall we review notes and checklists and check the next safe step?


## notes.email.started

- Module: notes
- Trigger: Use the permission-checked notes.email workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/notes/email/route.ts

**short:** Queueing your note email…

**friendly:** This request is in progress: queueing your note email. I'll wait for its confirmed result.

**detailed:** I'm working on this request: queueing your note email.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## notes.email.completed

- Module: notes
- Trigger: Use the permission-checked notes.email workflow. The authoritative backend confirms the exact result described: The note email has been queued. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/notes/email/route.ts

**short:** The note email has been queued.

**friendly:** Your note email is queued. Delivery is confirmed separately by the email service.

**detailed:** The note email has been queued.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in notes and checklists?


## notes.email.failed

- Module: notes
- Trigger: Use the permission-checked notes.email workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/notes/email/route.ts

**short:** I couldn't confirm the result: queueing your note email.

**friendly:** Something interrupted queueing your note email. Please review the record before repeating it.

**detailed:** This request needs review: queueing your note email. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: queueing your note email. Check the record before repeating the action.

**followUp:** Shall we review notes and checklists and check the next safe step?


## notes.checklist.started

- Module: notes
- Trigger: Use the permission-checked notes.checklist workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Saving your checklist…

**friendly:** Saving your checklist. You can keep working while it runs.

**detailed:** I'm working on this request: saving your checklist.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## notes.checklist.completed

- Module: notes
- Trigger: Use the permission-checked notes.checklist workflow. The authoritative backend confirms the exact result described: Your checklist has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** Your checklist has been saved.

**friendly:** Your checklist is saved. Its ticks record your review, not verified business completion.

**detailed:** Your checklist has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in notes and checklists?


## notes.checklist.failed

- Module: notes
- Trigger: Use the permission-checked notes.checklist workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Open Notes (/notes; authenticated owner/session)
- Sources: app/api/dashboard/notes/route.ts

**short:** I couldn't confirm the result: saving your checklist.

**friendly:** That step needs a closer look: saving your checklist. Let's check the saved record first.

**detailed:** This request needs review: saving your checklist. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving your checklist. Check the record before repeating the action.

**followUp:** Shall we review notes and checklists and check the next safe step?


## reminders.create.started

- Module: reminders
- Trigger: Use the permission-checked reminders.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Follow-ups and reminders (/reports/receivables; receivables:view)
- Sources: app/api/followups/[id]/route.ts

**short:** Saving the follow-up…

**friendly:** This request is in progress: saving the follow-up. I'll wait for its confirmed result.

**detailed:** I'm working on this request: saving the follow-up.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## reminders.create.completed

- Module: reminders
- Trigger: Use the permission-checked reminders.create workflow. The authoritative backend confirms the exact result described: Your follow-up has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Follow-ups and reminders (/reports/receivables; receivables:view)
- Sources: app/api/followups/[id]/route.ts

**short:** Your follow-up has been saved.

**friendly:** Your follow-up is saved with the details you chose.

**detailed:** Your follow-up has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in follow-ups and reminders?


## reminders.create.failed

- Module: reminders
- Trigger: Use the permission-checked reminders.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Follow-ups and reminders (/reports/receivables; receivables:view)
- Sources: app/api/followups/[id]/route.ts

**short:** I couldn't confirm the result: saving the follow-up.

**friendly:** Something interrupted saving the follow-up. Please review the record before repeating it.

**detailed:** This request needs review: saving the follow-up. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the follow-up. Check the record before repeating the action.

**followUp:** Shall we review follow-ups and reminders and check the next safe step?


## reminders.update.started

- Module: reminders
- Trigger: Use the permission-checked reminders.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Follow-ups and reminders (/reports/receivables; receivables:view)
- Sources: app/api/followups/[id]/route.ts

**short:** Updating the follow-up…

**friendly:** Let me take care of this step: updating the follow-up.

**detailed:** I'm working on this request: updating the follow-up.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## reminders.update.completed

- Module: reminders
- Trigger: Use the permission-checked reminders.update workflow. The authoritative backend confirms the exact result described: Your follow-up has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Follow-ups and reminders (/reports/receivables; receivables:view)
- Sources: app/api/followups/[id]/route.ts

**short:** Your follow-up has been updated.

**friendly:** The follow-up changes are saved.

**detailed:** Your follow-up has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in follow-ups and reminders?


## reminders.update.failed

- Module: reminders
- Trigger: Use the permission-checked reminders.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Follow-ups and reminders (/reports/receivables; receivables:view)
- Sources: app/api/followups/[id]/route.ts

**short:** I couldn't confirm the result: updating the follow-up.

**friendly:** I noticed a problem while updating the follow-up. Shall we review the details?

**detailed:** This request needs review: updating the follow-up. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating the follow-up. Check the record before repeating the action.

**followUp:** Shall we review follow-ups and reminders and check the next safe step?


## reminders.dismiss.started

- Module: reminders
- Trigger: Use the permission-checked reminders.dismiss workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Follow-ups and reminders (/reports/receivables; receivables:view)
- Sources: app/api/followups/[id]/route.ts

**short:** Saving the reminder acknowledgement…

**friendly:** This request is in progress: saving the reminder acknowledgement. I'll wait for its confirmed result.

**detailed:** I'm working on this request: saving the reminder acknowledgement.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## reminders.dismiss.completed

- Module: reminders
- Trigger: Use the permission-checked reminders.dismiss workflow. The authoritative backend confirms the exact result described: Your reminder acknowledgement has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Follow-ups and reminders (/reports/receivables; receivables:view)
- Sources: app/api/followups/[id]/route.ts

**short:** Your reminder acknowledgement has been saved.

**friendly:** I've recorded your acknowledgement. The underlying business issue may still need attention.

**detailed:** Your reminder acknowledgement has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in follow-ups and reminders?


## reminders.dismiss.failed

- Module: reminders
- Trigger: Use the permission-checked reminders.dismiss workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Follow-ups and reminders (/reports/receivables; receivables:view)
- Sources: app/api/followups/[id]/route.ts

**short:** I couldn't confirm the result: saving the reminder acknowledgement.

**friendly:** Something interrupted saving the reminder acknowledgement. Please review the record before repeating it.

**detailed:** This request needs review: saving the reminder acknowledgement. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the reminder acknowledgement. Check the record before repeating the action.

**followUp:** Shall we review follow-ups and reminders and check the next safe step?


## purchases.create.started

- Module: purchases
- Trigger: Use the permission-checked purchases.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** Recording the purchase…

**friendly:** I'm recording the purchase. I'll share the confirmed result.

**detailed:** I'm working on this request: recording the purchase.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## purchases.create.completed

- Module: purchases
- Trigger: Use the permission-checked purchases.create workflow. The authoritative backend confirms the exact result described: Your purchase has been recorded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved / saved, bell, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** Your purchase has been recorded.

**friendly:** Your purchase is saved. Shall we review the stock and payment details?

**detailed:** Your purchase has been recorded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in purchases?


## purchases.create.failed

- Module: purchases
- Trigger: Use the permission-checked purchases.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** I couldn't confirm the result: recording the purchase.

**friendly:** I couldn't finish recording the purchase. Shall we check the existing record before trying again?

**detailed:** This request needs review: recording the purchase. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: recording the purchase. Check the record before repeating the action.

**followUp:** Shall we review purchases and check the next safe step?


## purchases.update.started

- Module: purchases
- Trigger: Use the permission-checked purchases.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** Updating the purchase…

**friendly:** This request is in progress: updating the purchase. I'll wait for its confirmed result.

**detailed:** I'm working on this request: updating the purchase.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## purchases.update.completed

- Module: purchases
- Trigger: Use the permission-checked purchases.update workflow. The authoritative backend confirms the exact result described: Your purchase has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** Your purchase has been updated.

**friendly:** The purchase changes are saved and ready for review.

**detailed:** Your purchase has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in purchases?


## purchases.update.failed

- Module: purchases
- Trigger: Use the permission-checked purchases.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** I couldn't confirm the result: updating the purchase.

**friendly:** Something interrupted updating the purchase. Please review the record before repeating it.

**detailed:** This request needs review: updating the purchase. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating the purchase. Check the record before repeating the action.

**followUp:** Shall we review purchases and check the next safe step?


## purchases.delete.started

- Module: purchases
- Trigger: Use the permission-checked purchases.delete workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** Removing the purchase…

**friendly:** This request is in progress: removing the purchase. I'll wait for its confirmed result.

**detailed:** I'm working on this request: removing the purchase.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## purchases.delete.completed

- Module: purchases
- Trigger: Use the permission-checked purchases.delete workflow. The authoritative backend confirms the exact result described: The selected purchase has been removed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** The selected purchase has been removed.

**friendly:** The purchase record has been removed as requested.

**detailed:** The selected purchase has been removed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in purchases?


## purchases.delete.failed

- Module: purchases
- Trigger: Use the permission-checked purchases.delete workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** I couldn't confirm the result: removing the purchase.

**friendly:** Something interrupted removing the purchase. Please review the record before repeating it.

**detailed:** This request needs review: removing the purchase. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: removing the purchase. Check the record before repeating the action.

**followUp:** Shall we review purchases and check the next safe step?


## purchases.import.started

- Module: purchases
- Trigger: Use the permission-checked purchases.import workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** Importing purchases…

**friendly:** This request is in progress: importing purchases. I'll wait for its confirmed result.

**detailed:** I'm working on this request: importing purchases.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## purchases.import.completed

- Module: purchases
- Trigger: Use the permission-checked purchases.import workflow. The authoritative backend confirms the exact result described: The purchase import has finished. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** The purchase import has finished.

**friendly:** Your purchase import is ready to review. Let's check the accepted records.

**detailed:** The purchase import has finished.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in purchases?


## purchases.import.failed

- Module: purchases
- Trigger: Use the permission-checked purchases.import workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** I couldn't confirm the result: importing purchases.

**friendly:** Something interrupted importing purchases. Please review the record before repeating it.

**detailed:** This request needs review: importing purchases. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: importing purchases. Check the record before repeating the action.

**followUp:** Shall we review purchases and check the next safe step?


## purchases.invoice_number.started

- Module: purchases
- Trigger: Use the permission-checked purchases.invoice number workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** Saving the purchase invoice number…

**friendly:** Saving the purchase invoice number. You can keep working while it runs.

**detailed:** I'm working on this request: saving the purchase invoice number.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## purchases.invoice_number.completed

- Module: purchases
- Trigger: Use the permission-checked purchases.invoice number workflow. The authoritative backend confirms the exact result described: The purchase invoice number has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** The purchase invoice number has been saved.

**friendly:** The purchase invoice reference is updated.

**detailed:** The purchase invoice number has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in purchases?


## purchases.invoice_number.failed

- Module: purchases
- Trigger: Use the permission-checked purchases.invoice number workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** I couldn't confirm the result: saving the purchase invoice number.

**friendly:** That step needs a closer look: saving the purchase invoice number. Let's check the saved record first.

**detailed:** This request needs review: saving the purchase invoice number. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the purchase invoice number. Check the record before repeating the action.

**followUp:** Shall we review purchases and check the next safe step?


## purchases.export.started

- Module: purchases
- Trigger: Use the permission-checked purchases.export workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** Preparing the purchase export…

**friendly:** Let me take care of this step: preparing the purchase export.

**detailed:** I'm working on this request: preparing the purchase export.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## purchases.export.completed

- Module: purchases
- Trigger: Use the permission-checked purchases.export workflow. The authoritative backend confirms the exact result described: Your purchase export is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** Your purchase export is ready.

**friendly:** Your purchase export is ready to download.

**detailed:** Your purchase export is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in purchases?


## purchases.export.failed

- Module: purchases
- Trigger: Use the permission-checked purchases.export workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Purchases (/purchases; purchases:view)
- Sources: app/(dashboard)/purchases/actions.ts

**short:** I couldn't confirm the result: preparing the purchase export.

**friendly:** I noticed a problem while preparing the purchase export. Shall we review the details?

**detailed:** This request needs review: preparing the purchase export. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the purchase export. Check the record before repeating the action.

**followUp:** Shall we review purchases and check the next safe step?


## vendors.create.started

- Module: vendors
- Trigger: Use the permission-checked vendors.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Vendors (/vendors; vendors:view)
- Sources: app/(dashboard)/vendors/actions.ts

**short:** Saving the new vendor…

**friendly:** This request is in progress: saving the new vendor. I'll wait for its confirmed result.

**detailed:** I'm working on this request: saving the new vendor.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## vendors.create.completed

- Module: vendors
- Trigger: Use the permission-checked vendors.create workflow. The authoritative backend confirms the exact result described: The vendor record has been created. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Vendors (/vendors; vendors:view)
- Sources: app/(dashboard)/vendors/actions.ts

**short:** The vendor record has been created.

**friendly:** Your new vendor is saved. Shall we review their details?

**detailed:** The vendor record has been created.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in vendors?


## vendors.create.failed

- Module: vendors
- Trigger: Use the permission-checked vendors.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Vendors (/vendors; vendors:view)
- Sources: app/(dashboard)/vendors/actions.ts

**short:** I couldn't confirm the result: saving the new vendor.

**friendly:** Something interrupted saving the new vendor. Please review the record before repeating it.

**detailed:** This request needs review: saving the new vendor. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the new vendor. Check the record before repeating the action.

**followUp:** Shall we review vendors and check the next safe step?


## vendors.update.started

- Module: vendors
- Trigger: Use the permission-checked vendors.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Vendors (/vendors; vendors:view)
- Sources: app/(dashboard)/vendors/actions.ts

**short:** Updating vendor details…

**friendly:** Let me take care of this step: updating vendor details.

**detailed:** I'm working on this request: updating vendor details.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## vendors.update.completed

- Module: vendors
- Trigger: Use the permission-checked vendors.update workflow. The authoritative backend confirms the exact result described: The vendor details have been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Vendors (/vendors; vendors:view)
- Sources: app/(dashboard)/vendors/actions.ts

**short:** The vendor details have been updated.

**friendly:** The vendor changes are saved and ready to use.

**detailed:** The vendor details have been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in vendors?


## vendors.update.failed

- Module: vendors
- Trigger: Use the permission-checked vendors.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Vendors (/vendors; vendors:view)
- Sources: app/(dashboard)/vendors/actions.ts

**short:** I couldn't confirm the result: updating vendor details.

**friendly:** I noticed a problem while updating vendor details. Shall we review the details?

**detailed:** This request needs review: updating vendor details. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating vendor details. Check the record before repeating the action.

**followUp:** Shall we review vendors and check the next safe step?


## quotations.create.started

- Module: quotations
- Trigger: Use the permission-checked quotations.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** Preparing the quotation…

**friendly:** Preparing the quotation. You can keep working while it runs.

**detailed:** I'm working on this request: preparing the quotation.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## quotations.create.completed

- Module: quotations
- Trigger: Use the permission-checked quotations.create workflow. The authoritative backend confirms the exact result described: Your quotation has been created. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved / saved, bell, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** Your quotation has been created.

**friendly:** Your quotation is saved. It's ready for your review.

**detailed:** Your quotation has been created.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in quotations?


## quotations.create.failed

- Module: quotations
- Trigger: Use the permission-checked quotations.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** I couldn't confirm the result: preparing the quotation.

**friendly:** That step needs a closer look: preparing the quotation. Let's check the saved record first.

**detailed:** This request needs review: preparing the quotation. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the quotation. Check the record before repeating the action.

**followUp:** Shall we review quotations and check the next safe step?


## quotations.update.started

- Module: quotations
- Trigger: Use the permission-checked quotations.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** Updating the quotation…

**friendly:** I'm updating the quotation. I'll share the confirmed result.

**detailed:** I'm working on this request: updating the quotation.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## quotations.update.completed

- Module: quotations
- Trigger: Use the permission-checked quotations.update workflow. The authoritative backend confirms the exact result described: Your quotation has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** Your quotation has been updated.

**friendly:** The quotation changes are saved. Shall we check the final details?

**detailed:** Your quotation has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in quotations?


## quotations.update.failed

- Module: quotations
- Trigger: Use the permission-checked quotations.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** I couldn't confirm the result: updating the quotation.

**friendly:** I couldn't finish updating the quotation. Shall we check the existing record before trying again?

**detailed:** This request needs review: updating the quotation. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating the quotation. Check the record before repeating the action.

**followUp:** Shall we review quotations and check the next safe step?


## quotations.cancel.started

- Module: quotations
- Trigger: Use the permission-checked quotations.cancel workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** Cancelling the quotation…

**friendly:** This request is in progress: cancelling the quotation. I'll wait for its confirmed result.

**detailed:** I'm working on this request: cancelling the quotation.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## quotations.cancel.completed

- Module: quotations
- Trigger: Use the permission-checked quotations.cancel workflow. The authoritative backend confirms the exact result described: The quotation has been cancelled. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** The quotation has been cancelled.

**friendly:** The quotation is cancelled as requested.

**detailed:** The quotation has been cancelled.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in quotations?


## quotations.cancel.failed

- Module: quotations
- Trigger: Use the permission-checked quotations.cancel workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** I couldn't confirm the result: cancelling the quotation.

**friendly:** Something interrupted cancelling the quotation. Please review the record before repeating it.

**detailed:** This request needs review: cancelling the quotation. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: cancelling the quotation. Check the record before repeating the action.

**followUp:** Shall we review quotations and check the next safe step?


## quotations.send.started

- Module: quotations
- Trigger: Use the permission-checked quotations.send workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** Preparing the quotation share…

**friendly:** This request is in progress: preparing the quotation share. I'll wait for its confirmed result.

**detailed:** I'm working on this request: preparing the quotation share.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## quotations.send.completed

- Module: quotations
- Trigger: Use the permission-checked quotations.send workflow. The authoritative backend confirms the exact result described: The quotation sharing result has been recorded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** The quotation sharing result has been recorded.

**friendly:** The quotation sharing step is recorded. Delivery depends on the selected channel.

**detailed:** The quotation sharing result has been recorded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in quotations?


## quotations.send.failed

- Module: quotations
- Trigger: Use the permission-checked quotations.send workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** I couldn't confirm the result: preparing the quotation share.

**friendly:** Something interrupted preparing the quotation share. Please review the record before repeating it.

**detailed:** This request needs review: preparing the quotation share. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the quotation share. Check the record before repeating the action.

**followUp:** Shall we review quotations and check the next safe step?


## quotations.convert.started

- Module: quotations
- Trigger: Use the permission-checked quotations.convert workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** Creating an invoice from the quotation…

**friendly:** Let me take care of this step: creating an invoice from the quotation.

**detailed:** I'm working on this request: creating an invoice from the quotation.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## quotations.convert.completed

- Module: quotations
- Trigger: Use the permission-checked quotations.convert workflow. The authoritative backend confirms the exact result described: The quotation has been converted to an invoice. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** The quotation has been converted to an invoice.

**friendly:** Your invoice is ready from the quotation. Please review its billing details.

**detailed:** The quotation has been converted to an invoice.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in quotations?


## quotations.convert.failed

- Module: quotations
- Trigger: Use the permission-checked quotations.convert workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** I couldn't confirm the result: creating an invoice from the quotation.

**friendly:** I noticed a problem while creating an invoice from the quotation. Shall we review the details?

**detailed:** This request needs review: creating an invoice from the quotation. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: creating an invoice from the quotation. Check the record before repeating the action.

**followUp:** Shall we review quotations and check the next safe step?


## sales.create.started

- Module: sales
- Trigger: Use the permission-checked sales.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Sales (/sales; sales:view)
- Sources: app/(dashboard)/sales/actions.ts

**short:** Recording the sale…

**friendly:** Let me take care of this step: recording the sale.

**detailed:** I'm working on this request: recording the sale.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## sales.create.completed

- Module: sales
- Trigger: Use the permission-checked sales.create workflow. The authoritative backend confirms the exact result described: Your sale has been recorded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved / saved, bell, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Sales (/sales; sales:view)
- Sources: app/(dashboard)/sales/actions.ts

**short:** Your sale has been recorded.

**friendly:** Your sale is saved. The linked invoice is ready for review.

**detailed:** Your sale has been recorded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in sales?


## sales.create.failed

- Module: sales
- Trigger: Use the permission-checked sales.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Sales (/sales; sales:view)
- Sources: app/(dashboard)/sales/actions.ts

**short:** I couldn't confirm the result: recording the sale.

**friendly:** I noticed a problem while recording the sale. Shall we review the details?

**detailed:** This request needs review: recording the sale. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: recording the sale. Check the record before repeating the action.

**followUp:** Shall we review sales and check the next safe step?


## sales.delete.started

- Module: sales
- Trigger: Use the permission-checked sales.delete workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Sales (/sales; sales:view)
- Sources: app/(dashboard)/sales/actions.ts

**short:** Removing the sale…

**friendly:** Removing the sale. You can keep working while it runs.

**detailed:** I'm working on this request: removing the sale.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## sales.delete.completed

- Module: sales
- Trigger: Use the permission-checked sales.delete workflow. The authoritative backend confirms the exact result described: The selected sale has been removed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Sales (/sales; sales:view)
- Sources: app/(dashboard)/sales/actions.ts

**short:** The selected sale has been removed.

**friendly:** The sale record has been removed as requested.

**detailed:** The selected sale has been removed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in sales?


## sales.delete.failed

- Module: sales
- Trigger: Use the permission-checked sales.delete workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Sales (/sales; sales:view)
- Sources: app/(dashboard)/sales/actions.ts

**short:** I couldn't confirm the result: removing the sale.

**friendly:** That step needs a closer look: removing the sale. Let's check the saved record first.

**detailed:** This request needs review: removing the sale. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: removing the sale. Check the record before repeating the action.

**followUp:** Shall we review sales and check the next safe step?


## sales.thermal_document.started

- Module: sales
- Trigger: Use the permission-checked sales.thermal document workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Sales (/sales; sales:view)
- Sources: app/(dashboard)/sales/actions.ts

**short:** Preparing the thermal invoice…

**friendly:** Preparing the thermal invoice. You can keep working while it runs.

**detailed:** I'm working on this request: preparing the thermal invoice.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## sales.thermal_document.completed

- Module: sales
- Trigger: Use the permission-checked sales.thermal document workflow. The authoritative backend confirms the exact result described: The thermal invoice file is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Sales (/sales; sales:view)
- Sources: app/(dashboard)/sales/actions.ts

**short:** The thermal invoice file is ready.

**friendly:** Your thermal invoice file is ready. Check the preview before printing.

**detailed:** The thermal invoice file is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in sales?


## sales.thermal_document.failed

- Module: sales
- Trigger: Use the permission-checked sales.thermal document workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Sales (/sales; sales:view)
- Sources: app/(dashboard)/sales/actions.ts

**short:** I couldn't confirm the result: preparing the thermal invoice.

**friendly:** That step needs a closer look: preparing the thermal invoice. Let's check the saved record first.

**detailed:** This request needs review: preparing the thermal invoice. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the thermal invoice. Check the record before repeating the action.

**followUp:** Shall we review sales and check the next safe step?


## invoices.create.started

- Module: invoices
- Trigger: Use the permission-checked invoices.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** Preparing the invoice…

**friendly:** Let me take care of this step: preparing the invoice.

**detailed:** I'm working on this request: preparing the invoice.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## invoices.create.completed

- Module: invoices
- Trigger: Use the permission-checked invoices.create workflow. The authoritative backend confirms the exact result described: Your invoice has been created. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved / saved, bell, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** Your invoice has been created.

**friendly:** Your invoice is ready. Shall we review it together?

**detailed:** Your invoice has been created.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in invoices?


## invoices.create.failed

- Module: invoices
- Trigger: Use the permission-checked invoices.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** I couldn't confirm the result: preparing the invoice.

**friendly:** I noticed a problem while preparing the invoice. Shall we review the details?

**detailed:** This request needs review: preparing the invoice. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the invoice. Check the record before repeating the action.

**followUp:** Shall we review invoices and check the next safe step?


## invoices.update.started

- Module: invoices
- Trigger: Use the permission-checked invoices.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** Updating the invoice…

**friendly:** Updating the invoice. You can keep working while it runs.

**detailed:** I'm working on this request: updating the invoice.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## invoices.update.completed

- Module: invoices
- Trigger: Use the permission-checked invoices.update workflow. The authoritative backend confirms the exact result described: Your invoice has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** Your invoice has been updated.

**friendly:** The invoice changes are saved. Please review the latest document.

**detailed:** Your invoice has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in invoices?


## invoices.update.failed

- Module: invoices
- Trigger: Use the permission-checked invoices.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** I couldn't confirm the result: updating the invoice.

**friendly:** That step needs a closer look: updating the invoice. Let's check the saved record first.

**detailed:** This request needs review: updating the invoice. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating the invoice. Check the record before repeating the action.

**followUp:** Shall we review invoices and check the next safe step?


## invoices.email.started

- Module: invoices
- Trigger: Use the permission-checked invoices.email workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** Queueing the invoice email…

**friendly:** Let me take care of this step: queueing the invoice email.

**detailed:** I'm working on this request: queueing the invoice email.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## invoices.email.completed

- Module: invoices
- Trigger: Use the permission-checked invoices.email workflow. The authoritative backend confirms the exact result described: The invoice email has been queued. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** The invoice email has been queued.

**friendly:** Your invoice email is queued. The email service will confirm delivery separately.

**detailed:** The invoice email has been queued.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in invoices?


## invoices.email.failed

- Module: invoices
- Trigger: Use the permission-checked invoices.email workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** I couldn't confirm the result: queueing the invoice email.

**friendly:** I noticed a problem while queueing the invoice email. Shall we review the details?

**detailed:** This request needs review: queueing the invoice email. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: queueing the invoice email. Check the record before repeating the action.

**followUp:** Shall we review invoices and check the next safe step?


## invoices.whatsapp.started

- Module: invoices
- Trigger: Use the permission-checked invoices.whatsapp workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** Preparing the invoice share link…

**friendly:** Let me take care of this step: preparing the invoice share link.

**detailed:** I'm working on this request: preparing the invoice share link.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## invoices.whatsapp.completed

- Module: invoices
- Trigger: Use the permission-checked invoices.whatsapp workflow. The authoritative backend confirms the exact result described: The invoice share link is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** The invoice share link is ready.

**friendly:** Your invoice share link is ready. You'll choose whether to send the message.

**detailed:** The invoice share link is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in invoices?


## invoices.whatsapp.failed

- Module: invoices
- Trigger: Use the permission-checked invoices.whatsapp workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** I couldn't confirm the result: preparing the invoice share link.

**friendly:** I noticed a problem while preparing the invoice share link. Shall we review the details?

**detailed:** This request needs review: preparing the invoice share link. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the invoice share link. Check the record before repeating the action.

**followUp:** Shall we review invoices and check the next safe step?


## payments.record.started

- Module: payments
- Trigger: Use the permission-checked payments.record workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** Recording the invoice payment…

**friendly:** Let me take care of this step: recording the invoice payment.

**detailed:** I'm working on this request: recording the invoice payment.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## payments.record.completed

- Module: payments
- Trigger: Use the permission-checked payments.record workflow. The authoritative backend confirms the exact result described: The invoice payment has been recorded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved / saved, bell, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** The invoice payment has been recorded.

**friendly:** Your payment entry is saved against the invoice. You can review the updated balance.

**detailed:** The invoice payment has been recorded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in invoice payments?


## payments.record.failed

- Module: payments
- Trigger: Use the permission-checked payments.record workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** I couldn't confirm the result: recording the invoice payment.

**friendly:** I noticed a problem while recording the invoice payment. Shall we review the details?

**detailed:** This request needs review: recording the invoice payment. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: recording the invoice payment. Check the record before repeating the action.

**followUp:** Shall we review invoice payments and check the next safe step?


## payments.receipt.started

- Module: payments
- Trigger: Use the permission-checked payments.receipt workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** Preparing the payment receipt…

**friendly:** This request is in progress: preparing the payment receipt. I'll wait for its confirmed result.

**detailed:** I'm working on this request: preparing the payment receipt.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## payments.receipt.completed

- Module: payments
- Trigger: Use the permission-checked payments.receipt workflow. The authoritative backend confirms the exact result described: The payment receipt is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** The payment receipt is ready.

**friendly:** Your receipt is ready. Would you like to open it?

**detailed:** The payment receipt is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in invoice payments?


## payments.receipt.failed

- Module: payments
- Trigger: Use the permission-checked payments.receipt workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** I couldn't confirm the result: preparing the payment receipt.

**friendly:** Something interrupted preparing the payment receipt. Please review the record before repeating it.

**detailed:** This request needs review: preparing the payment receipt. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the payment receipt. Check the record before repeating the action.

**followUp:** Shall we review invoice payments and check the next safe step?


## payments.qr_order.started

- Module: payments
- Trigger: Use the permission-checked payments.qr order workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** Creating the QR payment request…

**friendly:** Creating the QR payment request. You can keep working while it runs.

**detailed:** I'm working on this request: creating the qr payment request.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## payments.qr_order.completed

- Module: payments
- Trigger: Use the permission-checked payments.qr order workflow. The authoritative backend confirms the exact result described: The payment request has been created. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** The payment request has been created.

**friendly:** The payment request is ready. This does not confirm that money was received.

**detailed:** The payment request has been created.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in invoice payments?


## payments.qr_order.failed

- Module: payments
- Trigger: Use the permission-checked payments.qr order workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** I couldn't confirm the result: creating the qr payment request.

**friendly:** That step needs a closer look: creating the qr payment request. Let's check the saved record first.

**detailed:** This request needs review: creating the qr payment request. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: creating the qr payment request. Check the record before repeating the action.

**followUp:** Shall we review invoice payments and check the next safe step?


## payments.qr_verify.started

- Module: payments
- Trigger: Use the permission-checked payments.qr verify workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** Verifying the gateway payment…

**friendly:** Let me take care of this step: verifying the gateway payment.

**detailed:** I'm working on this request: verifying the gateway payment.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## payments.qr_verify.completed

- Module: payments
- Trigger: Use the permission-checked payments.qr verify workflow. The authoritative backend confirms the exact result described: The gateway payment has been verified. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** The gateway payment has been verified.

**friendly:** The payment gateway has confirmed this payment. You can review its receipt.

**detailed:** The gateway payment has been verified.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in invoice payments?


## payments.qr_verify.failed

- Module: payments
- Trigger: Use the permission-checked payments.qr verify workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** I couldn't confirm the result: verifying the gateway payment.

**friendly:** I noticed a problem while verifying the gateway payment. Shall we review the details?

**detailed:** This request needs review: verifying the gateway payment. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: verifying the gateway payment. Check the record before repeating the action.

**followUp:** Shall we review invoice payments and check the next safe step?


## payments.qr_cancel.started

- Module: payments
- Trigger: Use the permission-checked payments.qr cancel workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** Cancelling the payment request…

**friendly:** This request is in progress: cancelling the payment request. I'll wait for its confirmed result.

**detailed:** I'm working on this request: cancelling the payment request.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## payments.qr_cancel.completed

- Module: payments
- Trigger: Use the permission-checked payments.qr cancel workflow. The authoritative backend confirms the exact result described: The payment request has been cancelled. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** The payment request has been cancelled.

**friendly:** That payment request is cancelled. Check the existing screen for any related transaction.

**detailed:** The payment request has been cancelled.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in invoice payments?


## payments.qr_cancel.failed

- Module: payments
- Trigger: Use the permission-checked payments.qr cancel workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Invoices (/invoices; sales:view)
- Sources: app/(dashboard)/invoices/actions.ts

**short:** I couldn't confirm the result: cancelling the payment request.

**friendly:** Something interrupted cancelling the payment request. Please review the record before repeating it.

**detailed:** This request needs review: cancelling the payment request. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: cancelling the payment request. Check the record before repeating the action.

**followUp:** Shall we review invoice payments and check the next safe step?


## advances.record.started

- Module: advances
- Trigger: Use the permission-checked advances.record workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Customer advances (/advances; advances:manage)
- Sources: app/(dashboard)/advances/actions.ts

**short:** Recording the customer advance…

**friendly:** Let me take care of this step: recording the customer advance.

**detailed:** I'm working on this request: recording the customer advance.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## advances.record.completed

- Module: advances
- Trigger: Use the permission-checked advances.record workflow. The authoritative backend confirms the exact result described: The customer advance has been recorded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Customer advances (/advances; advances:manage)
- Sources: app/(dashboard)/advances/actions.ts

**short:** The customer advance has been recorded.

**friendly:** Your advance entry is saved. Shall we review its available balance?

**detailed:** The customer advance has been recorded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in customer advances?


## advances.record.failed

- Module: advances
- Trigger: Use the permission-checked advances.record workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Customer advances (/advances; advances:manage)
- Sources: app/(dashboard)/advances/actions.ts

**short:** I couldn't confirm the result: recording the customer advance.

**friendly:** I noticed a problem while recording the customer advance. Shall we review the details?

**detailed:** This request needs review: recording the customer advance. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: recording the customer advance. Check the record before repeating the action.

**followUp:** Shall we review customer advances and check the next safe step?


## advances.adjust.started

- Module: advances
- Trigger: Use the permission-checked advances.adjust workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Customer advances (/advances; advances:manage)
- Sources: app/(dashboard)/advances/actions.ts

**short:** Applying the advance adjustment…

**friendly:** Let me take care of this step: applying the advance adjustment.

**detailed:** I'm working on this request: applying the advance adjustment.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## advances.adjust.completed

- Module: advances
- Trigger: Use the permission-checked advances.adjust workflow. The authoritative backend confirms the exact result described: The advance adjustment has been recorded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Customer advances (/advances; advances:manage)
- Sources: app/(dashboard)/advances/actions.ts

**short:** The advance adjustment has been recorded.

**friendly:** The advance adjustment is saved against the invoice.

**detailed:** The advance adjustment has been recorded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in customer advances?


## advances.adjust.failed

- Module: advances
- Trigger: Use the permission-checked advances.adjust workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Customer advances (/advances; advances:manage)
- Sources: app/(dashboard)/advances/actions.ts

**short:** I couldn't confirm the result: applying the advance adjustment.

**friendly:** I noticed a problem while applying the advance adjustment. Shall we review the details?

**detailed:** This request needs review: applying the advance adjustment. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: applying the advance adjustment. Check the record before repeating the action.

**followUp:** Shall we review customer advances and check the next safe step?


## receivables.statement.started

- Module: receivables
- Trigger: Use the permission-checked receivables.statement workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Receivables (/reports/receivables; receivables:view)
- Sources: app/api/reports/receivables/route.ts

**short:** Preparing the receivables statement…

**friendly:** I'm preparing the receivables statement. I'll share the confirmed result.

**detailed:** I'm working on this request: preparing the receivables statement.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## receivables.statement.completed

- Module: receivables
- Trigger: Use the permission-checked receivables.statement workflow. The authoritative backend confirms the exact result described: The receivables statement is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Receivables (/reports/receivables; receivables:view)
- Sources: app/api/reports/receivables/route.ts

**short:** The receivables statement is ready.

**friendly:** Your receivables statement is ready to review.

**detailed:** The receivables statement is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in receivables?


## receivables.statement.failed

- Module: receivables
- Trigger: Use the permission-checked receivables.statement workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Receivables (/reports/receivables; receivables:view)
- Sources: app/api/reports/receivables/route.ts

**short:** I couldn't confirm the result: preparing the receivables statement.

**friendly:** I couldn't finish preparing the receivables statement. Shall we check the existing record before trying again?

**detailed:** This request needs review: preparing the receivables statement. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the receivables statement. Check the record before repeating the action.

**followUp:** Shall we review receivables and check the next safe step?


## returns.create.started

- Module: returns
- Trigger: Use the permission-checked returns.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Sales returns (/sales-returns; sales:view)
- Sources: app/api/sales-returns/route.ts

**short:** Recording the sales return…

**friendly:** Recording the sales return. You can keep working while it runs.

**detailed:** I'm working on this request: recording the sales return.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## returns.create.completed

- Module: returns
- Trigger: Use the permission-checked returns.create workflow. The authoritative backend confirms the exact result described: The sales return has been recorded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Sales returns (/sales-returns; sales:view)
- Sources: app/api/sales-returns/route.ts

**short:** The sales return has been recorded.

**friendly:** Your return is saved. Let's review the resulting stock and credit details.

**detailed:** The sales return has been recorded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in sales returns?


## returns.create.failed

- Module: returns
- Trigger: Use the permission-checked returns.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Sales returns (/sales-returns; sales:view)
- Sources: app/api/sales-returns/route.ts

**short:** I couldn't confirm the result: recording the sales return.

**friendly:** That step needs a closer look: recording the sales return. Let's check the saved record first.

**detailed:** This request needs review: recording the sales return. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: recording the sales return. Check the record before repeating the action.

**followUp:** Shall we review sales returns and check the next safe step?


## returns.replace.started

- Module: returns
- Trigger: Use the permission-checked returns.replace workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Sales returns (/sales-returns; sales:view)
- Sources: app/api/sales-returns/route.ts

**short:** Recording the replacement…

**friendly:** Recording the replacement. You can keep working while it runs.

**detailed:** I'm working on this request: recording the replacement.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## returns.replace.completed

- Module: returns
- Trigger: Use the permission-checked returns.replace workflow. The authoritative backend confirms the exact result described: The replacement has been recorded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Sales returns (/sales-returns; sales:view)
- Sources: app/api/sales-returns/route.ts

**short:** The replacement has been recorded.

**friendly:** Your replacement entry is saved. The linked documents are ready to review.

**detailed:** The replacement has been recorded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in sales returns?


## returns.replace.failed

- Module: returns
- Trigger: Use the permission-checked returns.replace workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Sales returns (/sales-returns; sales:view)
- Sources: app/api/sales-returns/route.ts

**short:** I couldn't confirm the result: recording the replacement.

**friendly:** That step needs a closer look: recording the replacement. Let's check the saved record first.

**detailed:** This request needs review: recording the replacement. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: recording the replacement. Check the record before repeating the action.

**followUp:** Shall we review sales returns and check the next safe step?


## credit_notes.status.started

- Module: credit_notes
- Trigger: Use the permission-checked credit notes.status workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Credit notes (/sales-returns/credit-notes; sales:view)
- Sources: app/api/credit-notes/[id]/status/route.ts

**short:** Saving the credit-note status…

**friendly:** Saving the credit-note status. You can keep working while it runs.

**detailed:** I'm working on this request: saving the credit-note status.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## credit_notes.status.completed

- Module: credit_notes
- Trigger: Use the permission-checked credit notes.status workflow. The authoritative backend confirms the exact result described: The credit-note status has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Credit notes (/sales-returns/credit-notes; sales:view)
- Sources: app/api/credit-notes/[id]/status/route.ts

**short:** The credit-note status has been updated.

**friendly:** The credit-note status is saved. Review the remaining credit in the existing record.

**detailed:** The credit-note status has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in credit notes?


## credit_notes.status.failed

- Module: credit_notes
- Trigger: Use the permission-checked credit notes.status workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Credit notes (/sales-returns/credit-notes; sales:view)
- Sources: app/api/credit-notes/[id]/status/route.ts

**short:** I couldn't confirm the result: saving the credit-note status.

**friendly:** That step needs a closer look: saving the credit-note status. Let's check the saved record first.

**detailed:** This request needs review: saving the credit-note status. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the credit-note status. Check the record before repeating the action.

**followUp:** Shall we review credit notes and check the next safe step?


## credit_notes.document.started

- Module: credit_notes
- Trigger: Use the permission-checked credit notes.document workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Credit notes (/sales-returns/credit-notes; sales:view)
- Sources: app/api/credit-notes/[id]/status/route.ts

**short:** Preparing the credit-note PDF…

**friendly:** I'm preparing the credit-note pdf. I'll share the confirmed result.

**detailed:** I'm working on this request: preparing the credit-note pdf.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## credit_notes.document.completed

- Module: credit_notes
- Trigger: Use the permission-checked credit notes.document workflow. The authoritative backend confirms the exact result described: Your credit-note PDF is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Credit notes (/sales-returns/credit-notes; sales:view)
- Sources: app/api/credit-notes/[id]/status/route.ts

**short:** Your credit-note PDF is ready.

**friendly:** Your credit-note document is ready to download.

**detailed:** Your credit-note PDF is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in credit notes?


## credit_notes.document.failed

- Module: credit_notes
- Trigger: Use the permission-checked credit notes.document workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Credit notes (/sales-returns/credit-notes; sales:view)
- Sources: app/api/credit-notes/[id]/status/route.ts

**short:** I couldn't confirm the result: preparing the credit-note pdf.

**friendly:** I couldn't finish preparing the credit-note pdf. Shall we check the existing record before trying again?

**detailed:** This request needs review: preparing the credit-note pdf. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the credit-note pdf. Check the record before repeating the action.

**followUp:** Shall we review credit notes and check the next safe step?


## packaging.serials.started

- Module: packaging
- Trigger: Use the permission-checked packaging.serials workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Generating serial identities…

**friendly:** Let me take care of this step: generating serial identities.

**detailed:** I'm working on this request: generating serial identities.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.serials.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.serials workflow. The authoritative backend confirms the exact result described: The serial identities have been generated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The serial identities have been generated.

**friendly:** Your serial identities are ready. Let's review their product links.

**detailed:** The serial identities have been generated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.serials.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.serials workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: generating serial identities.

**friendly:** I noticed a problem while generating serial identities. Shall we review the details?

**detailed:** This request needs review: generating serial identities. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: generating serial identities. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## packaging.print_job.started

- Module: packaging
- Trigger: Use the permission-checked packaging.print job workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Preparing the packaging print job…

**friendly:** Let me take care of this step: preparing the packaging print job.

**detailed:** I'm working on this request: preparing the packaging print job.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.print_job.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.print job workflow. The authoritative backend confirms the exact result described: The packaging print job is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The packaging print job is ready.

**friendly:** Your packaging print job is prepared. Check the label preview before printing.

**detailed:** The packaging print job is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.print_job.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.print job workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: preparing the packaging print job.

**friendly:** I noticed a problem while preparing the packaging print job. Shall we review the details?

**detailed:** This request needs review: preparing the packaging print job. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the packaging print job. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## packaging.pdf.started

- Module: packaging
- Trigger: Use the permission-checked packaging.pdf workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Preparing the packaging PDF…

**friendly:** Preparing the packaging PDF. You can keep working while it runs.

**detailed:** I'm working on this request: preparing the packaging pdf.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.pdf.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.pdf workflow. The authoritative backend confirms the exact result described: The packaging PDF is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The packaging PDF is ready.

**friendly:** Your packaging PDF is ready to download or print.

**detailed:** The packaging PDF is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.pdf.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.pdf workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: preparing the packaging pdf.

**friendly:** That step needs a closer look: preparing the packaging pdf. Let's check the saved record first.

**detailed:** This request needs review: preparing the packaging pdf. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the packaging pdf. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## packaging.print_confirmation.started

- Module: packaging
- Trigger: Use the permission-checked packaging.print confirmation workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Recording the print confirmation…

**friendly:** I'm recording the print confirmation. I'll share the confirmed result.

**detailed:** I'm working on this request: recording the print confirmation.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.print_confirmation.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.print confirmation workflow. The authoritative backend confirms the exact result described: The print confirmation has been recorded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The print confirmation has been recorded.

**friendly:** Your print confirmation is saved. This records your confirmation, not independent printer delivery.

**detailed:** The print confirmation has been recorded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.print_confirmation.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.print confirmation workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: recording the print confirmation.

**friendly:** I couldn't finish recording the print confirmation. Shall we check the existing record before trying again?

**detailed:** This request needs review: recording the print confirmation. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: recording the print confirmation. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## packaging.reprint.started

- Module: packaging
- Trigger: Use the permission-checked packaging.reprint workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Preparing the serial reprint…

**friendly:** This request is in progress: preparing the serial reprint. I'll wait for its confirmed result.

**detailed:** I'm working on this request: preparing the serial reprint.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.reprint.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.reprint workflow. The authoritative backend confirms the exact result described: The serial reprint file is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The serial reprint file is ready.

**friendly:** The serial reprint is ready. Please review the existing print history.

**detailed:** The serial reprint file is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.reprint.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.reprint workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: preparing the serial reprint.

**friendly:** Something interrupted preparing the serial reprint. Please review the record before repeating it.

**detailed:** This request needs review: preparing the serial reprint. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the serial reprint. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## packaging.cart_add.started

- Module: packaging
- Trigger: Use the permission-checked packaging.cart add workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Adding items to the packaging cart…

**friendly:** Adding items to the packaging cart. You can keep working while it runs.

**detailed:** I'm working on this request: adding items to the packaging cart.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.cart_add.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.cart add workflow. The authoritative backend confirms the exact result described: The items have been added to the packaging cart. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The items have been added to the packaging cart.

**friendly:** Your packaging selections are saved in the cart.

**detailed:** The items have been added to the packaging cart.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.cart_add.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.cart add workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: adding items to the packaging cart.

**friendly:** That step needs a closer look: adding items to the packaging cart. Let's check the saved record first.

**detailed:** This request needs review: adding items to the packaging cart. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: adding items to the packaging cart. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## packaging.cart_remove.started

- Module: packaging
- Trigger: Use the permission-checked packaging.cart remove workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Removing items from the packaging cart…

**friendly:** Let me take care of this step: removing items from the packaging cart.

**detailed:** I'm working on this request: removing items from the packaging cart.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.cart_remove.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.cart remove workflow. The authoritative backend confirms the exact result described: The selected items have been removed from the packaging cart. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The selected items have been removed from the packaging cart.

**friendly:** Your packaging cart has been updated.

**detailed:** The selected items have been removed from the packaging cart.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.cart_remove.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.cart remove workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: removing items from the packaging cart.

**friendly:** I noticed a problem while removing items from the packaging cart. Shall we review the details?

**detailed:** This request needs review: removing items from the packaging cart. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: removing items from the packaging cart. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## packaging.settings.started

- Module: packaging
- Trigger: Use the permission-checked packaging.settings workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Saving packaging settings…

**friendly:** I'm saving packaging settings. I'll share the confirmed result.

**detailed:** I'm working on this request: saving packaging settings.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.settings.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.settings workflow. The authoritative backend confirms the exact result described: The packaging settings have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The packaging settings have been saved.

**friendly:** Your packaging configuration is saved for the next preparation step.

**detailed:** The packaging settings have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.settings.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.settings workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: saving packaging settings.

**friendly:** I couldn't finish saving packaging settings. Shall we check the existing record before trying again?

**detailed:** This request needs review: saving packaging settings. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving packaging settings. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## packaging.layout.started

- Module: packaging
- Trigger: Use the permission-checked packaging.layout workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Saving the label layout…

**friendly:** Saving the label layout. You can keep working while it runs.

**detailed:** I'm working on this request: saving the label layout.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.layout.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.layout workflow. The authoritative backend confirms the exact result described: The label layout has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The label layout has been saved.

**friendly:** Your label layout is saved. Shall we check a preview?

**detailed:** The label layout has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.layout.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.layout workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: saving the label layout.

**friendly:** That step needs a closer look: saving the label layout. Let's check the saved record first.

**detailed:** This request needs review: saving the label layout. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the label layout. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## packaging.layout_delete.started

- Module: packaging
- Trigger: Use the permission-checked packaging.layout delete workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Removing the label layout…

**friendly:** This request is in progress: removing the label layout. I'll wait for its confirmed result.

**detailed:** I'm working on this request: removing the label layout.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.layout_delete.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.layout delete workflow. The authoritative backend confirms the exact result described: The selected label layout has been removed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The selected label layout has been removed.

**friendly:** The layout has been removed from your available presets.

**detailed:** The selected label layout has been removed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.layout_delete.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.layout delete workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: removing the label layout.

**friendly:** Something interrupted removing the label layout. Please review the record before repeating it.

**detailed:** This request needs review: removing the label layout. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: removing the label layout. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## packaging.hsn.started

- Module: packaging
- Trigger: Use the permission-checked packaging.hsn workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Saving packaging HSN rules…

**friendly:** I'm saving packaging hsn rules. I'll share the confirmed result.

**detailed:** I'm working on this request: saving packaging hsn rules.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.hsn.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.hsn workflow. The authoritative backend confirms the exact result described: The packaging HSN rules have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The packaging HSN rules have been saved.

**friendly:** Your packaging HSN rules are saved for review.

**detailed:** The packaging HSN rules have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.hsn.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.hsn workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: saving packaging hsn rules.

**friendly:** I couldn't finish saving packaging hsn rules. Shall we check the existing record before trying again?

**detailed:** This request needs review: saving packaging hsn rules. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving packaging hsn rules. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## packaging.validate.started

- Module: packaging
- Trigger: Use the permission-checked packaging.validate workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / thinking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Checking packaging readiness…

**friendly:** Checking packaging readiness. You can keep working while it runs.

**detailed:** I'm working on this request: checking packaging readiness.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## packaging.validate.completed

- Module: packaging
- Trigger: Use the permission-checked packaging.validate workflow. The authoritative backend confirms the exact result described: The packaging readiness result is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The packaging readiness result is ready.

**friendly:** Your packaging check is ready. Please review any items needing details.

**detailed:** The packaging readiness result is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in packaging and serial identities?


## packaging.validate.failed

- Module: packaging
- Trigger: Use the permission-checked packaging.validate workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: checking packaging readiness.

**friendly:** That step needs a closer look: checking packaging readiness. Let's check the saved record first.

**detailed:** This request needs review: checking packaging readiness. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: checking packaging readiness. Check the record before repeating the action.

**followUp:** Shall we review packaging and serial identities and check the next safe step?


## labels.cart_add.started

- Module: labels
- Trigger: Use the permission-checked labels.cart add workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** Adding labels to the cart…

**friendly:** This request is in progress: adding labels to the cart. I'll wait for its confirmed result.

**detailed:** I'm working on this request: adding labels to the cart.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## labels.cart_add.completed

- Module: labels
- Trigger: Use the permission-checked labels.cart add workflow. The authoritative backend confirms the exact result described: The label selections have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** The label selections have been saved.

**friendly:** Your label selections are in the cart.

**detailed:** The label selections have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in label files and print jobs?


## labels.cart_add.failed

- Module: labels
- Trigger: Use the permission-checked labels.cart add workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** I couldn't confirm the result: adding labels to the cart.

**friendly:** Something interrupted adding labels to the cart. Please review the record before repeating it.

**detailed:** This request needs review: adding labels to the cart. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: adding labels to the cart. Check the record before repeating the action.

**followUp:** Shall we review label files and print jobs and check the next safe step?


## labels.cart_clear.started

- Module: labels
- Trigger: Use the permission-checked labels.cart clear workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** Clearing the label cart…

**friendly:** Clearing the label cart. You can keep working while it runs.

**detailed:** I'm working on this request: clearing the label cart.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## labels.cart_clear.completed

- Module: labels
- Trigger: Use the permission-checked labels.cart clear workflow. The authoritative backend confirms the exact result described: The label cart has been cleared. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** The label cart has been cleared.

**friendly:** The label cart is clear and ready for your next selection.

**detailed:** The label cart has been cleared.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in label files and print jobs?


## labels.cart_clear.failed

- Module: labels
- Trigger: Use the permission-checked labels.cart clear workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** I couldn't confirm the result: clearing the label cart.

**friendly:** That step needs a closer look: clearing the label cart. Let's check the saved record first.

**detailed:** This request needs review: clearing the label cart. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: clearing the label cart. Check the record before repeating the action.

**followUp:** Shall we review label files and print jobs and check the next safe step?


## labels.job.started

- Module: labels
- Trigger: Use the permission-checked labels.job workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** Preparing the label job…

**friendly:** I'm preparing the label job. I'll share the confirmed result.

**detailed:** I'm working on this request: preparing the label job.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## labels.job.completed

- Module: labels
- Trigger: Use the permission-checked labels.job workflow. The authoritative backend confirms the exact result described: Your label job has been created. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** Your label job has been created.

**friendly:** Your label job is ready for review. It does not confirm physical printing.

**detailed:** Your label job has been created.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in label files and print jobs?


## labels.job.failed

- Module: labels
- Trigger: Use the permission-checked labels.job workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** I couldn't confirm the result: preparing the label job.

**friendly:** I couldn't finish preparing the label job. Shall we check the existing record before trying again?

**detailed:** This request needs review: preparing the label job. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the label job. Check the record before repeating the action.

**followUp:** Shall we review label files and print jobs and check the next safe step?


## labels.file.started

- Module: labels
- Trigger: Use the permission-checked labels.file workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** Generating the label file…

**friendly:** Generating the label file. You can keep working while it runs.

**detailed:** I'm working on this request: generating the label file.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## labels.file.completed

- Module: labels
- Trigger: Use the permission-checked labels.file workflow. The authoritative backend confirms the exact result described: The label file is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** The label file is ready.

**friendly:** Your label file is ready. Shall we open the preview?

**detailed:** The label file is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in label files and print jobs?


## labels.file.failed

- Module: labels
- Trigger: Use the permission-checked labels.file workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: View Label Jobs (/labels; labels:view)
- Sources: app/(dashboard)/labels/actions.ts

**short:** I couldn't confirm the result: generating the label file.

**friendly:** That step needs a closer look: generating the label file. Let's check the saved record first.

**detailed:** This request needs review: generating the label file. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: generating the label file. Check the record before repeating the action.

**followUp:** Shall we review label files and print jobs and check the next safe step?


## pricing.plan.started

- Module: pricing
- Trigger: Use the permission-checked pricing.plan workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Pricing and margins (/settings/marketplaces; marketplace:settings_manage)
- Sources: app/api/pricing/planner/route.ts

**short:** Preparing the pricing plan…

**friendly:** Preparing the pricing plan. You can keep working while it runs.

**detailed:** I'm working on this request: preparing the pricing plan.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## pricing.plan.completed

- Module: pricing
- Trigger: Use the permission-checked pricing.plan workflow. The authoritative backend confirms the exact result described: The pricing plan is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Pricing and margins (/settings/marketplaces; marketplace:settings_manage)
- Sources: app/api/pricing/planner/route.ts

**short:** The pricing plan is ready.

**friendly:** Your pricing plan is ready. Please review the inputs and margins before applying it.

**detailed:** The pricing plan is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in pricing and margins?


## pricing.plan.failed

- Module: pricing
- Trigger: Use the permission-checked pricing.plan workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Pricing and margins (/settings/marketplaces; marketplace:settings_manage)
- Sources: app/api/pricing/planner/route.ts

**short:** I couldn't confirm the result: preparing the pricing plan.

**friendly:** That step needs a closer look: preparing the pricing plan. Let's check the saved record first.

**detailed:** This request needs review: preparing the pricing plan. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the pricing plan. Check the record before repeating the action.

**followUp:** Shall we review pricing and margins and check the next safe step?


## pricing.suggestion.started

- Module: pricing
- Trigger: Use the permission-checked pricing.suggestion workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / thinking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Pricing and margins (/settings/marketplaces; marketplace:settings_manage)
- Sources: app/api/inventory/price-suggestion/route.ts

**short:** Calculating a price suggestion…

**friendly:** Let me take care of this step: calculating a price suggestion.

**detailed:** I'm working on this request: calculating a price suggestion.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## pricing.suggestion.completed

- Module: pricing
- Trigger: Use the permission-checked pricing.suggestion workflow. The authoritative backend confirms the exact result described: The price suggestion is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Pricing and margins (/settings/marketplaces; marketplace:settings_manage)
- Sources: app/api/inventory/price-suggestion/route.ts

**short:** The price suggestion is ready.

**friendly:** The price suggestion is ready for review. It stays a suggestion until you choose to apply it.

**detailed:** The price suggestion is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in pricing and margins?


## pricing.suggestion.failed

- Module: pricing
- Trigger: Use the permission-checked pricing.suggestion workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Pricing and margins (/settings/marketplaces; marketplace:settings_manage)
- Sources: app/api/inventory/price-suggestion/route.ts

**short:** I couldn't confirm the result: calculating a price suggestion.

**friendly:** I noticed a problem while calculating a price suggestion. Shall we review the details?

**detailed:** This request needs review: calculating a price suggestion. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: calculating a price suggestion. Check the record before repeating the action.

**followUp:** Shall we review pricing and margins and check the next safe step?


## pricing.apply.started

- Module: pricing
- Trigger: Use the permission-checked pricing.apply workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Pricing and margins (/settings/marketplaces; marketplace:settings_manage)
- Sources: app/api/pricing/planner/route.ts

**short:** Saving the selected price…

**friendly:** I'm saving the selected price. I'll share the confirmed result.

**detailed:** I'm working on this request: saving the selected price.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## pricing.apply.completed

- Module: pricing
- Trigger: Use the permission-checked pricing.apply workflow. The authoritative backend confirms the exact result described: The selected price has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Pricing and margins (/settings/marketplaces; marketplace:settings_manage)
- Sources: app/api/pricing/planner/route.ts

**short:** The selected price has been saved.

**friendly:** Your selected price is saved. You can review it in the existing price history.

**detailed:** The selected price has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in pricing and margins?


## pricing.apply.failed

- Module: pricing
- Trigger: Use the permission-checked pricing.apply workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Pricing and margins (/settings/marketplaces; marketplace:settings_manage)
- Sources: app/api/pricing/planner/route.ts

**short:** I couldn't confirm the result: saving the selected price.

**friendly:** I couldn't finish saving the selected price. Shall we check the existing record before trying again?

**detailed:** This request needs review: saving the selected price. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the selected price. Check the record before repeating the action.

**followUp:** Shall we review pricing and margins and check the next safe step?


## loyalty.settings.started

- Module: loyalty
- Trigger: Use the permission-checked loyalty.settings workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Loyalty points (/reports/loyalty-points; reports:view)
- Sources: app/(dashboard)/reports/loyalty-points/actions.ts

**short:** Saving loyalty settings…

**friendly:** Saving loyalty settings. You can keep working while it runs.

**detailed:** I'm working on this request: saving loyalty settings.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## loyalty.settings.completed

- Module: loyalty
- Trigger: Use the permission-checked loyalty.settings workflow. The authoritative backend confirms the exact result described: The loyalty settings have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Loyalty points (/reports/loyalty-points; reports:view)
- Sources: app/(dashboard)/reports/loyalty-points/actions.ts

**short:** The loyalty settings have been saved.

**friendly:** Your loyalty rules are saved for future activity.

**detailed:** The loyalty settings have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in loyalty points?


## loyalty.settings.failed

- Module: loyalty
- Trigger: Use the permission-checked loyalty.settings workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Loyalty points (/reports/loyalty-points; reports:view)
- Sources: app/(dashboard)/reports/loyalty-points/actions.ts

**short:** I couldn't confirm the result: saving loyalty settings.

**friendly:** That step needs a closer look: saving loyalty settings. Let's check the saved record first.

**detailed:** This request needs review: saving loyalty settings. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving loyalty settings. Check the record before repeating the action.

**followUp:** Shall we review loyalty points and check the next safe step?


## loyalty.redeem.started

- Module: loyalty
- Trigger: Use the permission-checked loyalty.redeem workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** Recording the loyalty redemption…

**friendly:** Let me take care of this step: recording the loyalty redemption.

**detailed:** I'm working on this request: recording the loyalty redemption.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## loyalty.redeem.completed

- Module: loyalty
- Trigger: Use the permission-checked loyalty.redeem workflow. The authoritative backend confirms the exact result described: The loyalty redemption has been recorded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The loyalty redemption has been recorded.

**friendly:** The loyalty redemption is saved against the confirmed transaction.

**detailed:** The loyalty redemption has been recorded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in loyalty points?


## loyalty.redeem.failed

- Module: loyalty
- Trigger: Use the permission-checked loyalty.redeem workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** I couldn't confirm the result: recording the loyalty redemption.

**friendly:** I noticed a problem while recording the loyalty redemption. Shall we review the details?

**detailed:** This request needs review: recording the loyalty redemption. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: recording the loyalty redemption. Check the record before repeating the action.

**followUp:** Shall we review loyalty points and check the next safe step?


## coupons.create.started

- Module: coupons
- Trigger: Use the permission-checked coupons.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** Creating the coupon…

**friendly:** Creating the coupon. You can keep working while it runs.

**detailed:** I'm working on this request: creating the coupon.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## coupons.create.completed

- Module: coupons
- Trigger: Use the permission-checked coupons.create workflow. The authoritative backend confirms the exact result described: Your coupon has been created. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** Your coupon has been created.

**friendly:** Your coupon is saved. Let's review its eligibility rules.

**detailed:** Your coupon has been created.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in coupons and promotions?


## coupons.create.failed

- Module: coupons
- Trigger: Use the permission-checked coupons.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** I couldn't confirm the result: creating the coupon.

**friendly:** That step needs a closer look: creating the coupon. Let's check the saved record first.

**detailed:** This request needs review: creating the coupon. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: creating the coupon. Check the record before repeating the action.

**followUp:** Shall we review coupons and promotions and check the next safe step?


## coupons.status.started

- Module: coupons
- Trigger: Use the permission-checked coupons.status workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** Updating coupon availability…

**friendly:** Updating coupon availability. You can keep working while it runs.

**detailed:** I'm working on this request: updating coupon availability.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## coupons.status.completed

- Module: coupons
- Trigger: Use the permission-checked coupons.status workflow. The authoritative backend confirms the exact result described: The coupon availability has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** The coupon availability has been updated.

**friendly:** The coupon setting is saved. You can review its current availability.

**detailed:** The coupon availability has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in coupons and promotions?


## coupons.status.failed

- Module: coupons
- Trigger: Use the permission-checked coupons.status workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** I couldn't confirm the result: updating coupon availability.

**friendly:** That step needs a closer look: updating coupon availability. Let's check the saved record first.

**detailed:** This request needs review: updating coupon availability. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating coupon availability. Check the record before repeating the action.

**followUp:** Shall we review coupons and promotions and check the next safe step?


## coupons.validate.started

- Module: coupons
- Trigger: Use the permission-checked coupons.validate workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / thinking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** Checking the coupon…

**friendly:** This request is in progress: checking the coupon. I'll wait for its confirmed result.

**detailed:** I'm working on this request: checking the coupon.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## coupons.validate.completed

- Module: coupons
- Trigger: Use the permission-checked coupons.validate workflow. The authoritative backend confirms the exact result described: The coupon check is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** The coupon check is ready.

**friendly:** The coupon eligibility result is ready. It does not confirm a sale or redemption.

**detailed:** The coupon check is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in coupons and promotions?


## coupons.validate.failed

- Module: coupons
- Trigger: Use the permission-checked coupons.validate workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** I couldn't confirm the result: checking the coupon.

**friendly:** Something interrupted checking the coupon. Please review the record before repeating it.

**detailed:** This request needs review: checking the coupon. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: checking the coupon. Check the record before repeating the action.

**followUp:** Shall we review coupons and promotions and check the next safe step?


## coupons.offer_banner.started

- Module: coupons
- Trigger: Use the permission-checked coupons.offer banner workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** Saving the offer banner…

**friendly:** I'm saving the offer banner. I'll share the confirmed result.

**detailed:** I'm working on this request: saving the offer banner.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## coupons.offer_banner.completed

- Module: coupons
- Trigger: Use the permission-checked coupons.offer banner workflow. The authoritative backend confirms the exact result described: The offer banner has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** The offer banner has been saved.

**friendly:** Your offer banner is saved for review.

**detailed:** The offer banner has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in coupons and promotions?


## coupons.offer_banner.failed

- Module: coupons
- Trigger: Use the permission-checked coupons.offer banner workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Coupons and promotions (/settings/coupons; settings:manage)
- Sources: app/(dashboard)/settings/coupons/actions.ts

**short:** I couldn't confirm the result: saving the offer banner.

**friendly:** I couldn't finish saving the offer banner. Shall we check the existing record before trying again?

**detailed:** This request needs review: saving the offer banner. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the offer banner. Check the record before repeating the action.

**followUp:** Shall we review coupons and promotions and check the next safe step?


## masters.create.started

- Module: masters
- Trigger: Use the permission-checked masters.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** Creating the master code…

**friendly:** Creating the master code. You can keep working while it runs.

**detailed:** I'm working on this request: creating the master code.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## masters.create.completed

- Module: masters
- Trigger: Use the permission-checked masters.create workflow. The authoritative backend confirms the exact result described: The master code has been created. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** The master code has been created.

**friendly:** Your master code is saved and ready to use.

**detailed:** The master code has been created.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in master codes and merges?


## masters.create.failed

- Module: masters
- Trigger: Use the permission-checked masters.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** I couldn't confirm the result: creating the master code.

**friendly:** That step needs a closer look: creating the master code. Let's check the saved record first.

**detailed:** This request needs review: creating the master code. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: creating the master code. Check the record before repeating the action.

**followUp:** Shall we review master codes and merges and check the next safe step?


## masters.update.started

- Module: masters
- Trigger: Use the permission-checked masters.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** Updating the master code…

**friendly:** I'm updating the master code. I'll share the confirmed result.

**detailed:** I'm working on this request: updating the master code.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## masters.update.completed

- Module: masters
- Trigger: Use the permission-checked masters.update workflow. The authoritative backend confirms the exact result described: The master code has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** The master code has been updated.

**friendly:** The master-code changes are saved.

**detailed:** The master code has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in master codes and merges?


## masters.update.failed

- Module: masters
- Trigger: Use the permission-checked masters.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** I couldn't confirm the result: updating the master code.

**friendly:** I couldn't finish updating the master code. Shall we check the existing record before trying again?

**detailed:** This request needs review: updating the master code. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating the master code. Check the record before repeating the action.

**followUp:** Shall we review master codes and merges and check the next safe step?


## masters.delete.started

- Module: masters
- Trigger: Use the permission-checked masters.delete workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** Removing the master code…

**friendly:** I'm removing the master code. I'll share the confirmed result.

**detailed:** I'm working on this request: removing the master code.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## masters.delete.completed

- Module: masters
- Trigger: Use the permission-checked masters.delete workflow. The authoritative backend confirms the exact result described: The master code has been removed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** The master code has been removed.

**friendly:** The selected master code has been removed as requested.

**detailed:** The master code has been removed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in master codes and merges?


## masters.delete.failed

- Module: masters
- Trigger: Use the permission-checked masters.delete workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** I couldn't confirm the result: removing the master code.

**friendly:** I couldn't finish removing the master code. Shall we check the existing record before trying again?

**detailed:** This request needs review: removing the master code. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: removing the master code. Check the record before repeating the action.

**followUp:** Shall we review master codes and merges and check the next safe step?


## masters.import.started

- Module: masters
- Trigger: Use the permission-checked masters.import workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** Importing master codes…

**friendly:** I'm importing master codes. I'll share the confirmed result.

**detailed:** I'm working on this request: importing master codes.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## masters.import.completed

- Module: masters
- Trigger: Use the permission-checked masters.import workflow. The authoritative backend confirms the exact result described: The master-code import has finished. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** The master-code import has finished.

**friendly:** Your master-code import is ready for review.

**detailed:** The master-code import has finished.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in master codes and merges?


## masters.import.failed

- Module: masters
- Trigger: Use the permission-checked masters.import workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/settings/codes/actions.ts

**short:** I couldn't confirm the result: importing master codes.

**friendly:** I couldn't finish importing master codes. Shall we check the existing record before trying again?

**detailed:** This request needs review: importing master codes. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: importing master codes. Check the record before repeating the action.

**followUp:** Shall we review master codes and merges and check the next safe step?


## masters.merge.started

- Module: masters
- Trigger: Use the permission-checked masters.merge workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/masters/merge/page.tsx

**short:** Merging master records…

**friendly:** Merging master records. You can keep working while it runs.

**detailed:** I'm working on this request: merging master records.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## masters.merge.completed

- Module: masters
- Trigger: Use the permission-checked masters.merge workflow. The authoritative backend confirms the exact result described: The master records have been merged. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/masters/merge/page.tsx

**short:** The master records have been merged.

**friendly:** The merge is confirmed. Please review the surviving master record.

**detailed:** The master records have been merged.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in master codes and merges?


## masters.merge.failed

- Module: masters
- Trigger: Use the permission-checked masters.merge workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Master codes and merges (/settings/codes; settings:manage)
- Sources: app/(dashboard)/masters/merge/page.tsx

**short:** I couldn't confirm the result: merging master records.

**friendly:** That step needs a closer look: merging master records. Let's check the saved record first.

**detailed:** This request needs review: merging master records. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: merging master records. Check the record before repeating the action.

**followUp:** Shall we review master codes and merges and check the next safe step?


## communications.queue.started

- Module: communications
- Trigger: Use the permission-checked communications.queue workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** Queueing your message…

**friendly:** I'm queueing your message. I'll share the confirmed result.

**detailed:** I'm working on this request: queueing your message.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## communications.queue.completed

- Module: communications
- Trigger: Use the permission-checked communications.queue workflow. The authoritative backend confirms the exact result described: Your message has been queued. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** Your message has been queued.

**friendly:** Your message is queued. I'll keep delivery separate from queueing.

**detailed:** Your message has been queued.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in email and communications?


## communications.queue.failed

- Module: communications
- Trigger: Use the permission-checked communications.queue workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** I couldn't confirm the result: queueing your message.

**friendly:** I couldn't finish queueing your message. Shall we check the existing record before trying again?

**detailed:** This request needs review: queueing your message. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: queueing your message. Check the record before repeating the action.

**followUp:** Shall we review email and communications and check the next safe step?


## communications.send.started

- Module: communications
- Trigger: Use the permission-checked communications.send workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** Sending the email…

**friendly:** Sending the email. You can keep working while it runs.

**detailed:** I'm working on this request: sending the email.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## communications.send.completed

- Module: communications
- Trigger: Use the permission-checked communications.send workflow. The authoritative backend confirms the exact result described: The email service accepted your message. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** The email service accepted your message.

**friendly:** The email service has accepted the message. Delivery may still be pending.

**detailed:** The email service accepted your message.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in email and communications?


## communications.send.failed

- Module: communications
- Trigger: Use the permission-checked communications.send workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** I couldn't confirm the result: sending the email.

**friendly:** That step needs a closer look: sending the email. Let's check the saved record first.

**detailed:** This request needs review: sending the email. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: sending the email. Check the record before repeating the action.

**followUp:** Shall we review email and communications and check the next safe step?


## communications.delivery.started

- Module: communications
- Trigger: Use the permission-checked communications.delivery workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** Checking message delivery…

**friendly:** This request is in progress: checking message delivery. I'll wait for its confirmed result.

**detailed:** I'm working on this request: checking message delivery.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## communications.delivery.completed

- Module: communications
- Trigger: Use the permission-checked communications.delivery workflow. The authoritative backend confirms the exact result described: Message delivery has been confirmed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** Message delivery has been confirmed.

**friendly:** The delivery provider confirmed this message was delivered.

**detailed:** Message delivery has been confirmed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in email and communications?


## communications.delivery.failed

- Module: communications
- Trigger: Use the permission-checked communications.delivery workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** I couldn't confirm the result: checking message delivery.

**friendly:** Something interrupted checking message delivery. Please review the record before repeating it.

**detailed:** This request needs review: checking message delivery. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: checking message delivery. Check the record before repeating the action.

**followUp:** Shall we review email and communications and check the next safe step?


## communications.inbox_sync.started

- Module: communications
- Trigger: Use the permission-checked communications.inbox sync workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** Refreshing the inbox…

**friendly:** This request is in progress: refreshing the inbox. I'll wait for its confirmed result.

**detailed:** I'm working on this request: refreshing the inbox.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## communications.inbox_sync.completed

- Module: communications
- Trigger: Use the permission-checked communications.inbox sync workflow. The authoritative backend confirms the exact result described: The inbox refresh has completed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** The inbox refresh has completed.

**friendly:** Your inbox refresh is complete. New messages are ready to review if any arrived.

**detailed:** The inbox refresh has completed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in email and communications?


## communications.inbox_sync.failed

- Module: communications
- Trigger: Use the permission-checked communications.inbox sync workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** I couldn't confirm the result: refreshing the inbox.

**friendly:** Something interrupted refreshing the inbox. Please review the record before repeating it.

**detailed:** This request needs review: refreshing the inbox. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: refreshing the inbox. Check the record before repeating the action.

**followUp:** Shall we review email and communications and check the next safe step?


## communications.retry.started

- Module: communications
- Trigger: Use the permission-checked communications.retry workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** Queueing the message retry…

**friendly:** Queueing the message retry. You can keep working while it runs.

**detailed:** I'm working on this request: queueing the message retry.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## communications.retry.completed

- Module: communications
- Trigger: Use the permission-checked communications.retry workflow. The authoritative backend confirms the exact result described: The message retry has been queued. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** The message retry has been queued.

**friendly:** Your retry is queued. I'll wait for a confirmed send or delivery result.

**detailed:** The message retry has been queued.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in email and communications?


## communications.retry.failed

- Module: communications
- Trigger: Use the permission-checked communications.retry workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** I couldn't confirm the result: queueing the message retry.

**friendly:** That step needs a closer look: queueing the message retry. Let's check the saved record first.

**detailed:** This request needs review: queueing the message retry. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: queueing the message retry. Check the record before repeating the action.

**followUp:** Shall we review email and communications and check the next safe step?


## communications.cancel.started

- Module: communications
- Trigger: Use the permission-checked communications.cancel workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** Cancelling the queued message…

**friendly:** Cancelling the queued message. You can keep working while it runs.

**detailed:** I'm working on this request: cancelling the queued message.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## communications.cancel.completed

- Module: communications
- Trigger: Use the permission-checked communications.cancel workflow. The authoritative backend confirms the exact result described: The queued message has been cancelled. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** The queued message has been cancelled.

**friendly:** The queued message is cancelled as requested.

**detailed:** The queued message has been cancelled.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in email and communications?


## communications.cancel.failed

- Module: communications
- Trigger: Use the permission-checked communications.cancel workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** I couldn't confirm the result: cancelling the queued message.

**friendly:** That step needs a closer look: cancelling the queued message. Let's check the saved record first.

**detailed:** This request needs review: cancelling the queued message. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: cancelling the queued message. Check the record before repeating the action.

**followUp:** Shall we review email and communications and check the next safe step?


## communications.read.started

- Module: communications
- Trigger: Use the permission-checked communications.read workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** Saving the message read state…

**friendly:** This request is in progress: saving the message read state. I'll wait for its confirmed result.

**detailed:** I'm working on this request: saving the message read state.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## communications.read.completed

- Module: communications
- Trigger: Use the permission-checked communications.read workflow. The authoritative backend confirms the exact result described: The message read state has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** The message read state has been saved.

**friendly:** Your message review state is saved.

**detailed:** The message read state has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in email and communications?


## communications.read.failed

- Module: communications
- Trigger: Use the permission-checked communications.read workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** I couldn't confirm the result: saving the message read state.

**friendly:** Something interrupted saving the message read state. Please review the record before repeating it.

**detailed:** This request needs review: saving the message read state. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the message read state. Check the record before repeating the action.

**followUp:** Shall we review email and communications and check the next safe step?


## communications.attachments.started

- Module: communications
- Trigger: Use the permission-checked communications.attachments workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** Preparing the attachment…

**friendly:** This request is in progress: preparing the attachment. I'll wait for its confirmed result.

**detailed:** I'm working on this request: preparing the attachment.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## communications.attachments.completed

- Module: communications
- Trigger: Use the permission-checked communications.attachments workflow. The authoritative backend confirms the exact result described: The attachment is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** The attachment is ready.

**friendly:** Your attachment is ready to open using the existing secure download.

**detailed:** The attachment is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in email and communications?


## communications.attachments.failed

- Module: communications
- Trigger: Use the permission-checked communications.attachments workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** I couldn't confirm the result: preparing the attachment.

**friendly:** Something interrupted preparing the attachment. Please review the record before repeating it.

**detailed:** This request needs review: preparing the attachment. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the attachment. Check the record before repeating the action.

**followUp:** Shall we review email and communications and check the next safe step?


## email_templates.create.started

- Module: email_templates
- Trigger: Use the permission-checked email templates.create workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and message templates (/settings/email-templates; settings:manage)
- Sources: app/(dashboard)/settings/email-templates/actions.ts

**short:** Creating the message template…

**friendly:** I'm creating the message template. I'll share the confirmed result.

**detailed:** I'm working on this request: creating the message template.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## email_templates.create.completed

- Module: email_templates
- Trigger: Use the permission-checked email templates.create workflow. The authoritative backend confirms the exact result described: The message template has been created. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Email and message templates (/settings/email-templates; settings:manage)
- Sources: app/(dashboard)/settings/email-templates/actions.ts

**short:** The message template has been created.

**friendly:** Your new template is saved. Please review its wording and variables.

**detailed:** The message template has been created.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in email and message templates?


## email_templates.create.failed

- Module: email_templates
- Trigger: Use the permission-checked email templates.create workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and message templates (/settings/email-templates; settings:manage)
- Sources: app/(dashboard)/settings/email-templates/actions.ts

**short:** I couldn't confirm the result: creating the message template.

**friendly:** I couldn't finish creating the message template. Shall we check the existing record before trying again?

**detailed:** This request needs review: creating the message template. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: creating the message template. Check the record before repeating the action.

**followUp:** Shall we review email and message templates and check the next safe step?


## email_templates.update.started

- Module: email_templates
- Trigger: Use the permission-checked email templates.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and message templates (/settings/email-templates; settings:manage)
- Sources: app/(dashboard)/settings/email-templates/actions.ts

**short:** Updating the message template…

**friendly:** This request is in progress: updating the message template. I'll wait for its confirmed result.

**detailed:** I'm working on this request: updating the message template.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## email_templates.update.completed

- Module: email_templates
- Trigger: Use the permission-checked email templates.update workflow. The authoritative backend confirms the exact result described: The message template has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Email and message templates (/settings/email-templates; settings:manage)
- Sources: app/(dashboard)/settings/email-templates/actions.ts

**short:** The message template has been updated.

**friendly:** Your template changes are saved and ready for review.

**detailed:** The message template has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in email and message templates?


## email_templates.update.failed

- Module: email_templates
- Trigger: Use the permission-checked email templates.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and message templates (/settings/email-templates; settings:manage)
- Sources: app/(dashboard)/settings/email-templates/actions.ts

**short:** I couldn't confirm the result: updating the message template.

**friendly:** Something interrupted updating the message template. Please review the record before repeating it.

**detailed:** This request needs review: updating the message template. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating the message template. Check the record before repeating the action.

**followUp:** Shall we review email and message templates and check the next safe step?


## email_templates.toggle.started

- Module: email_templates
- Trigger: Use the permission-checked email templates.toggle workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and message templates (/settings/email-templates; settings:manage)
- Sources: app/(dashboard)/settings/email-templates/actions.ts

**short:** Updating template availability…

**friendly:** Let me take care of this step: updating template availability.

**detailed:** I'm working on this request: updating template availability.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## email_templates.toggle.completed

- Module: email_templates
- Trigger: Use the permission-checked email templates.toggle workflow. The authoritative backend confirms the exact result described: The template availability has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Email and message templates (/settings/email-templates; settings:manage)
- Sources: app/(dashboard)/settings/email-templates/actions.ts

**short:** The template availability has been saved.

**friendly:** The template availability is saved.

**detailed:** The template availability has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in email and message templates?


## email_templates.toggle.failed

- Module: email_templates
- Trigger: Use the permission-checked email templates.toggle workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Email and message templates (/settings/email-templates; settings:manage)
- Sources: app/(dashboard)/settings/email-templates/actions.ts

**short:** I couldn't confirm the result: updating template availability.

**friendly:** I noticed a problem while updating template availability. Shall we review the details?

**detailed:** This request needs review: updating template availability. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating template availability. Check the record before repeating the action.

**followUp:** Shall we review email and message templates and check the next safe step?


## website.save.started

- Module: website
- Trigger: Use the permission-checked website.save workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** Saving website content…

**friendly:** I'm saving website content. I'll share the confirmed result.

**detailed:** I'm working on this request: saving website content.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## website.save.completed

- Module: website
- Trigger: Use the permission-checked website.save workflow. The authoritative backend confirms the exact result described: The website content has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** The website content has been saved.

**friendly:** Your website changes are saved. Review the publication state before sharing them.

**detailed:** The website content has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in website and editorial management?


## website.save.failed

- Module: website
- Trigger: Use the permission-checked website.save workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** I couldn't confirm the result: saving website content.

**friendly:** I couldn't finish saving website content. Shall we check the existing record before trying again?

**detailed:** This request needs review: saving website content. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving website content. Check the record before repeating the action.

**followUp:** Shall we review website and editorial management and check the next safe step?


## website.preview.started

- Module: website
- Trigger: Use the permission-checked website.preview workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** Preparing the website preview…

**friendly:** This request is in progress: preparing the website preview. I'll wait for its confirmed result.

**detailed:** I'm working on this request: preparing the website preview.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## website.preview.completed

- Module: website
- Trigger: Use the permission-checked website.preview workflow. The authoritative backend confirms the exact result described: The website preview is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** The website preview is ready.

**friendly:** Your website preview is ready. Shall we check how it looks?

**detailed:** The website preview is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in website and editorial management?


## website.preview.failed

- Module: website
- Trigger: Use the permission-checked website.preview workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** I couldn't confirm the result: preparing the website preview.

**friendly:** Something interrupted preparing the website preview. Please review the record before repeating it.

**detailed:** This request needs review: preparing the website preview. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the website preview. Check the record before repeating the action.

**followUp:** Shall we review website and editorial management and check the next safe step?


## website.publish.started

- Module: website
- Trigger: Use the permission-checked website.publish workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** Publishing the approved content…

**friendly:** I'm publishing the approved content. I'll share the confirmed result.

**detailed:** I'm working on this request: publishing the approved content.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## website.publish.completed

- Module: website
- Trigger: Use the permission-checked website.publish workflow. The authoritative backend confirms the exact result described: The publication result has been confirmed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The publication result has been confirmed.

**friendly:** The publishing step is confirmed. Review the published content in the existing website tools.

**detailed:** The publication result has been confirmed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in website and editorial management?


## website.publish.failed

- Module: website
- Trigger: Use the permission-checked website.publish workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: none
- Sources: No verified trigger connected

**short:** I couldn't confirm the result: publishing the approved content.

**friendly:** I couldn't finish publishing the approved content. Shall we check the existing record before trying again?

**detailed:** This request needs review: publishing the approved content. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: publishing the approved content. Check the record before repeating the action.

**followUp:** Shall we review website and editorial management and check the next safe step?


## website.media.started

- Module: website
- Trigger: Use the permission-checked website.media workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** Uploading website media…

**friendly:** Uploading website media. You can keep working while it runs.

**detailed:** I'm working on this request: uploading website media.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## website.media.completed

- Module: website
- Trigger: Use the permission-checked website.media workflow. The authoritative backend confirms the exact result described: The website media has been uploaded. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** The website media has been uploaded.

**friendly:** Your website media is uploaded and ready to review.

**detailed:** The website media has been uploaded.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in website and editorial management?


## website.media.failed

- Module: website
- Trigger: Use the permission-checked website.media workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** I couldn't confirm the result: uploading website media.

**friendly:** That step needs a closer look: uploading website media. Let's check the saved record first.

**detailed:** This request needs review: uploading website media. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: uploading website media. Check the record before repeating the action.

**followUp:** Shall we review website and editorial management and check the next safe step?


## website.enquiry.started

- Module: website
- Trigger: Use the permission-checked website.enquiry workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** Saving the enquiry review state…

**friendly:** Let me take care of this step: saving the enquiry review state.

**detailed:** I'm working on this request: saving the enquiry review state.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## website.enquiry.completed

- Module: website
- Trigger: Use the permission-checked website.enquiry workflow. The authoritative backend confirms the exact result described: The enquiry review state has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** The enquiry review state has been saved.

**friendly:** Your enquiry review state is saved. This does not verify an external customer issue was resolved.

**detailed:** The enquiry review state has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in website and editorial management?


## website.enquiry.failed

- Module: website
- Trigger: Use the permission-checked website.enquiry workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** I couldn't confirm the result: saving the enquiry review state.

**friendly:** I noticed a problem while saving the enquiry review state. Shall we review the details?

**detailed:** This request needs review: saving the enquiry review state. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the enquiry review state. Check the record before repeating the action.

**followUp:** Shall we review website and editorial management and check the next safe step?


## website.rollback.started

- Module: website
- Trigger: Use the permission-checked website.rollback workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** Restoring the selected content version…

**friendly:** This request is in progress: restoring the selected content version. I'll wait for its confirmed result.

**detailed:** I'm working on this request: restoring the selected content version.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## website.rollback.completed

- Module: website
- Trigger: Use the permission-checked website.rollback workflow. The authoritative backend confirms the exact result described: The selected content version has been restored. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** The selected content version has been restored.

**friendly:** Your chosen content version is restored. Please check the preview.

**detailed:** The selected content version has been restored.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in website and editorial management?


## website.rollback.failed

- Module: website
- Trigger: Use the permission-checked website.rollback workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** I couldn't confirm the result: restoring the selected content version.

**friendly:** Something interrupted restoring the selected content version. Please review the record before repeating it.

**detailed:** This request needs review: restoring the selected content version. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: restoring the selected content version. Check the record before repeating the action.

**followUp:** Shall we review website and editorial management and check the next safe step?


## website.setup.started

- Module: website
- Trigger: Use the permission-checked website.setup workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** Preparing website integration settings…

**friendly:** Let me take care of this step: preparing website integration settings.

**detailed:** I'm working on this request: preparing website integration settings.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## website.setup.completed

- Module: website
- Trigger: Use the permission-checked website.setup workflow. The authoritative backend confirms the exact result described: The website integration settings have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** The website integration settings have been saved.

**friendly:** Your website integration settings are saved for review.

**detailed:** The website integration settings have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in website and editorial management?


## website.setup.failed

- Module: website
- Trigger: Use the permission-checked website.setup workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Website and editorial management (/website-management; settings:landing_page)
- Sources: app/api/website/editorial/route.ts

**short:** I couldn't confirm the result: preparing website integration settings.

**friendly:** I noticed a problem while preparing website integration settings. Shall we review the details?

**detailed:** This request needs review: preparing website integration settings. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing website integration settings. Check the record before repeating the action.

**followUp:** Shall we review website and editorial management and check the next safe step?


## work_tracker.start.started

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.start workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Starting the work session…

**friendly:** Let me take care of this step: starting the work session.

**detailed:** I'm working on this request: starting the work session.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## work_tracker.start.completed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.start workflow. The authoritative backend confirms the exact result described: Your work session has started. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Your work session has started.

**friendly:** Your work session is running. Ready when you are.

**detailed:** Your work session has started.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in work tracking?


## work_tracker.start.failed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.start workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** I couldn't confirm the result: starting the work session.

**friendly:** I noticed a problem while starting the work session. Shall we review the details?

**detailed:** This request needs review: starting the work session. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: starting the work session. Check the record before repeating the action.

**followUp:** Shall we review work tracking and check the next safe step?


## work_tracker.pause.started

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.pause workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Pausing the work session…

**friendly:** Let me take care of this step: pausing the work session.

**detailed:** I'm working on this request: pausing the work session.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## work_tracker.pause.completed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.pause workflow. The authoritative backend confirms the exact result described: Your work session has been paused. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / rest
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Your work session has been paused.

**friendly:** Your session is paused. Take the time you need.

**detailed:** Your work session has been paused.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in work tracking?


## work_tracker.pause.failed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.pause workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** I couldn't confirm the result: pausing the work session.

**friendly:** I noticed a problem while pausing the work session. Shall we review the details?

**detailed:** This request needs review: pausing the work session. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: pausing the work session. Check the record before repeating the action.

**followUp:** Shall we review work tracking and check the next safe step?


## work_tracker.stop.started

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.stop workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Saving the finished work session…

**friendly:** Let me take care of this step: saving the finished work session.

**detailed:** I'm working on this request: saving the finished work session.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## work_tracker.stop.completed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.stop workflow. The authoritative backend confirms the exact result described: Your work session has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Your work session has been saved.

**friendly:** Your session is saved. Review the recorded time in the tracker.

**detailed:** Your work session has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in work tracking?


## work_tracker.stop.failed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.stop workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** I couldn't confirm the result: saving the finished work session.

**friendly:** I noticed a problem while saving the finished work session. Shall we review the details?

**detailed:** This request needs review: saving the finished work session. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the finished work session. Check the record before repeating the action.

**followUp:** Shall we review work tracking and check the next safe step?


## work_tracker.edit.started

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.edit workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Updating the work entry…

**friendly:** Let me take care of this step: updating the work entry.

**detailed:** I'm working on this request: updating the work entry.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## work_tracker.edit.completed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.edit workflow. The authoritative backend confirms the exact result described: The work entry has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** The work entry has been updated.

**friendly:** Your work-entry changes are saved.

**detailed:** The work entry has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in work tracking?


## work_tracker.edit.failed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.edit workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** I couldn't confirm the result: updating the work entry.

**friendly:** I noticed a problem while updating the work entry. Shall we review the details?

**detailed:** This request needs review: updating the work entry. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating the work entry. Check the record before repeating the action.

**followUp:** Shall we review work tracking and check the next safe step?


## work_tracker.delete.started

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.delete workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Removing the work entry…

**friendly:** This request is in progress: removing the work entry. I'll wait for its confirmed result.

**detailed:** I'm working on this request: removing the work entry.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## work_tracker.delete.completed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.delete workflow. The authoritative backend confirms the exact result described: The work entry has been removed. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** The work entry has been removed.

**friendly:** The selected work entry has been removed as requested.

**detailed:** The work entry has been removed.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in work tracking?


## work_tracker.delete.failed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.delete workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** I couldn't confirm the result: removing the work entry.

**friendly:** Something interrupted removing the work entry. Please review the record before repeating it.

**detailed:** This request needs review: removing the work entry. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: removing the work entry. Check the record before repeating the action.

**followUp:** Shall we review work tracking and check the next safe step?


## work_tracker.target.started

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.target workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Saving your work target…

**friendly:** This request is in progress: saving your work target. I'll wait for its confirmed result.

**detailed:** I'm working on this request: saving your work target.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## work_tracker.target.completed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.target workflow. The authoritative backend confirms the exact result described: Your work target has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Your work target has been saved.

**friendly:** Your target is saved. Progress follows the tracker's recorded activity.

**detailed:** Your work target has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in work tracking?


## work_tracker.target.failed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.target workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** I couldn't confirm the result: saving your work target.

**friendly:** Something interrupted saving your work target. Please review the record before repeating it.

**detailed:** This request needs review: saving your work target. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving your work target. Check the record before repeating the action.

**followUp:** Shall we review work tracking and check the next safe step?


## work_tracker.pair.started

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.pair workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Pairing the browser extension…

**friendly:** I'm pairing the browser extension. I'll share the confirmed result.

**detailed:** I'm working on this request: pairing the browser extension.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## work_tracker.pair.completed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.pair workflow. The authoritative backend confirms the exact result described: The browser extension has been paired. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** The browser extension has been paired.

**friendly:** Your extension is paired. Review its tracking controls in the existing screen.

**detailed:** The browser extension has been paired.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in work tracking?


## work_tracker.pair.failed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.pair workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** I couldn't confirm the result: pairing the browser extension.

**friendly:** I couldn't finish pairing the browser extension. Shall we check the existing record before trying again?

**detailed:** This request needs review: pairing the browser extension. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: pairing the browser extension. Check the record before repeating the action.

**followUp:** Shall we review work tracking and check the next safe step?


## work_tracker.unpair.started

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.unpair workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Disconnecting the browser extension…

**friendly:** This request is in progress: disconnecting the browser extension. I'll wait for its confirmed result.

**detailed:** I'm working on this request: disconnecting the browser extension.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## work_tracker.unpair.completed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.unpair workflow. The authoritative backend confirms the exact result described: The browser extension has been disconnected. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** The browser extension has been disconnected.

**friendly:** The extension connection has been removed as requested.

**detailed:** The browser extension has been disconnected.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in work tracking?


## work_tracker.unpair.failed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.unpair workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** I couldn't confirm the result: disconnecting the browser extension.

**friendly:** Something interrupted disconnecting the browser extension. Please review the record before repeating it.

**detailed:** This request needs review: disconnecting the browser extension. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: disconnecting the browser extension. Check the record before repeating the action.

**followUp:** Shall we review work tracking and check the next safe step?


## work_tracker.export.started

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.export workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Preparing the work-tracker export…

**friendly:** Let me take care of this step: preparing the work-tracker export.

**detailed:** I'm working on this request: preparing the work-tracker export.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## work_tracker.export.completed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.export workflow. The authoritative backend confirms the exact result described: Your work-tracker export is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** Your work-tracker export is ready.

**friendly:** Your work-tracker export is ready to download.

**detailed:** Your work-tracker export is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in work tracking?


## work_tracker.export.failed

- Module: work_tracker
- Trigger: Use the permission-checked work tracker.export workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Work tracking (/work-tracker; authenticated owner/session)
- Sources: lib/work-tracker/service.ts

**short:** I couldn't confirm the result: preparing the work-tracker export.

**friendly:** I noticed a problem while preparing the work-tracker export. Shall we review the details?

**detailed:** This request needs review: preparing the work-tracker export. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the work-tracker export. Check the record before repeating the action.

**followUp:** Shall we review work tracking and check the next safe step?


## weekly_reports.prepare.started

- Module: weekly_reports
- Trigger: Use the permission-checked weekly reports.prepare workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Weekly business reports (/settings/weekly-reports; settings:manage)
- Sources: lib/weekly-report/service.ts

**short:** Preparing the weekly report…

**friendly:** I'm preparing the weekly report. I'll share the confirmed result.

**detailed:** I'm working on this request: preparing the weekly report.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## weekly_reports.prepare.completed

- Module: weekly_reports
- Trigger: Use the permission-checked weekly reports.prepare workflow. The authoritative backend confirms the exact result described: Your weekly report is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved / saved, bell, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Weekly business reports (/settings/weekly-reports; settings:manage)
- Sources: lib/weekly-report/service.ts

**short:** Your weekly report is ready.

**friendly:** Your weekly report is prepared from the available verified data.

**detailed:** Your weekly report is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in weekly business reports?


## weekly_reports.prepare.failed

- Module: weekly_reports
- Trigger: Use the permission-checked weekly reports.prepare workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Weekly business reports (/settings/weekly-reports; settings:manage)
- Sources: lib/weekly-report/service.ts

**short:** I couldn't confirm the result: preparing the weekly report.

**friendly:** I couldn't finish preparing the weekly report. Shall we check the existing record before trying again?

**detailed:** This request needs review: preparing the weekly report. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the weekly report. Check the record before repeating the action.

**followUp:** Shall we review weekly business reports and check the next safe step?


## weekly_reports.schedule.started

- Module: weekly_reports
- Trigger: Use the permission-checked weekly reports.schedule workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Weekly business reports (/settings/weekly-reports; settings:manage)
- Sources: lib/weekly-report/service.ts

**short:** Saving the weekly-report schedule…

**friendly:** Let me take care of this step: saving the weekly-report schedule.

**detailed:** I'm working on this request: saving the weekly-report schedule.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## weekly_reports.schedule.completed

- Module: weekly_reports
- Trigger: Use the permission-checked weekly reports.schedule workflow. The authoritative backend confirms the exact result described: The weekly-report schedule has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Weekly business reports (/settings/weekly-reports; settings:manage)
- Sources: lib/weekly-report/service.ts

**short:** The weekly-report schedule has been saved.

**friendly:** Your weekly-report schedule is saved.

**detailed:** The weekly-report schedule has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in weekly business reports?


## weekly_reports.schedule.failed

- Module: weekly_reports
- Trigger: Use the permission-checked weekly reports.schedule workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Weekly business reports (/settings/weekly-reports; settings:manage)
- Sources: lib/weekly-report/service.ts

**short:** I couldn't confirm the result: saving the weekly-report schedule.

**friendly:** I noticed a problem while saving the weekly-report schedule. Shall we review the details?

**detailed:** This request needs review: saving the weekly-report schedule. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving the weekly-report schedule. Check the record before repeating the action.

**followUp:** Shall we review weekly business reports and check the next safe step?


## weekly_reports.delivery.started

- Module: weekly_reports
- Trigger: Use the permission-checked weekly reports.delivery workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Weekly business reports (/settings/weekly-reports; settings:manage)
- Sources: lib/weekly-report/service.ts

**short:** Queueing the weekly-report email…

**friendly:** Queueing the weekly-report email. You can keep working while it runs.

**detailed:** I'm working on this request: queueing the weekly-report email.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## weekly_reports.delivery.completed

- Module: weekly_reports
- Trigger: Use the permission-checked weekly reports.delivery workflow. The authoritative backend confirms the exact result described: The weekly-report email has been queued. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Weekly business reports (/settings/weekly-reports; settings:manage)
- Sources: lib/weekly-report/service.ts

**short:** The weekly-report email has been queued.

**friendly:** Your weekly-report email is queued. Delivery remains separately tracked.

**detailed:** The weekly-report email has been queued.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in weekly business reports?


## weekly_reports.delivery.failed

- Module: weekly_reports
- Trigger: Use the permission-checked weekly reports.delivery workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Weekly business reports (/settings/weekly-reports; settings:manage)
- Sources: lib/weekly-report/service.ts

**short:** I couldn't confirm the result: queueing the weekly-report email.

**friendly:** That step needs a closer look: queueing the weekly-report email. Let's check the saved record first.

**detailed:** This request needs review: queueing the weekly-report email. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: queueing the weekly-report email. Check the record before repeating the action.

**followUp:** Shall we review weekly business reports and check the next safe step?


## analytics.snapshot.started

- Module: analytics
- Trigger: Use the permission-checked analytics.snapshot workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Analytics snapshots (/reports; reports:view)
- Sources: app/api/cron/analytics/daily/route.ts

**short:** Preparing the analytics snapshot…

**friendly:** Let me take care of this step: preparing the analytics snapshot.

**detailed:** I'm working on this request: preparing the analytics snapshot.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## analytics.snapshot.completed

- Module: analytics
- Trigger: Use the permission-checked analytics.snapshot workflow. The authoritative backend confirms the exact result described: The analytics snapshot has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Analytics snapshots (/reports; reports:view)
- Sources: app/api/cron/analytics/daily/route.ts

**short:** The analytics snapshot has been saved.

**friendly:** The analytics snapshot is ready. Check its data date before using it.

**detailed:** The analytics snapshot has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in analytics snapshots?


## analytics.snapshot.failed

- Module: analytics
- Trigger: Use the permission-checked analytics.snapshot workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Analytics snapshots (/reports; reports:view)
- Sources: app/api/cron/analytics/daily/route.ts

**short:** I couldn't confirm the result: preparing the analytics snapshot.

**friendly:** I noticed a problem while preparing the analytics snapshot. Shall we review the details?

**detailed:** This request needs review: preparing the analytics snapshot. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: preparing the analytics snapshot. Check the record before repeating the action.

**followUp:** Shall we review analytics snapshots and check the next safe step?


## gci.generate.started

- Module: gci
- Trigger: Use the permission-checked gci.generate workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review GCI certificates (/inventory; inventory:view)
- Sources: app/actions/gci.ts

**short:** Requesting the GCI certificate…

**friendly:** I'm requesting the gci certificate. I'll share the confirmed result.

**detailed:** I'm working on this request: requesting the gci certificate.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## gci.generate.completed

- Module: gci
- Trigger: Use the permission-checked gci.generate workflow. The authoritative backend confirms the exact result described: The GCI certificate has been generated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review GCI certificates (/inventory; inventory:view)
- Sources: app/actions/gci.ts

**short:** The GCI certificate has been generated.

**friendly:** Your GCI certificate result is ready to review.

**detailed:** The GCI certificate has been generated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in gci certificates?


## gci.generate.failed

- Module: gci
- Trigger: Use the permission-checked gci.generate workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review GCI certificates (/inventory; inventory:view)
- Sources: app/actions/gci.ts

**short:** I couldn't confirm the result: requesting the gci certificate.

**friendly:** I couldn't finish requesting the gci certificate. Shall we check the existing record before trying again?

**detailed:** This request needs review: requesting the gci certificate. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: requesting the gci certificate. Check the record before repeating the action.

**followUp:** Shall we review gci certificates and check the next safe step?


## gci.bulk.started

- Module: gci
- Trigger: Use the permission-checked gci.bulk workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review GCI certificates (/inventory; inventory:view)
- Sources: app/actions/gci.ts

**short:** Requesting the selected certificates…

**friendly:** This request is in progress: requesting the selected certificates. I'll wait for its confirmed result.

**detailed:** I'm working on this request: requesting the selected certificates.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## gci.bulk.completed

- Module: gci
- Trigger: Use the permission-checked gci.bulk workflow. The authoritative backend confirms the exact result described: The certificate batch result is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review GCI certificates (/inventory; inventory:view)
- Sources: app/actions/gci.ts

**short:** The certificate batch result is ready.

**friendly:** Your certificate batch result is ready. Please check any individual failures.

**detailed:** The certificate batch result is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in gci certificates?


## gci.bulk.failed

- Module: gci
- Trigger: Use the permission-checked gci.bulk workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review GCI certificates (/inventory; inventory:view)
- Sources: app/actions/gci.ts

**short:** I couldn't confirm the result: requesting the selected certificates.

**friendly:** Something interrupted requesting the selected certificates. Please review the record before repeating it.

**detailed:** This request needs review: requesting the selected certificates. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: requesting the selected certificates. Check the record before repeating the action.

**followUp:** Shall we review gci certificates and check the next safe step?


## gci.email.started

- Module: gci
- Trigger: Use the permission-checked gci.email workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review GCI certificates (/inventory; inventory:view)
- Sources: app/actions/gci.ts

**short:** Queueing the certificate email…

**friendly:** Queueing the certificate email. You can keep working while it runs.

**detailed:** I'm working on this request: queueing the certificate email.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## gci.email.completed

- Module: gci
- Trigger: Use the permission-checked gci.email workflow. The authoritative backend confirms the exact result described: The certificate email has been queued. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review GCI certificates (/inventory; inventory:view)
- Sources: app/actions/gci.ts

**short:** The certificate email has been queued.

**friendly:** Your certificate email is queued for the existing email service.

**detailed:** The certificate email has been queued.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in gci certificates?


## gci.email.failed

- Module: gci
- Trigger: Use the permission-checked gci.email workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review GCI certificates (/inventory; inventory:view)
- Sources: app/actions/gci.ts

**short:** I couldn't confirm the result: queueing the certificate email.

**friendly:** That step needs a closer look: queueing the certificate email. Let's check the saved record first.

**detailed:** This request needs review: queueing the certificate email. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: queueing the certificate email. Check the record before repeating the action.

**followUp:** Shall we review gci certificates and check the next safe step?


## verification.lookup.started

- Module: verification
- Trigger: Use the permission-checked verification.lookup workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Public gemstone verification (/erp/packaging/logs; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Checking the gemstone serial…

**friendly:** This request is in progress: checking the gemstone serial. I'll wait for its confirmed result.

**detailed:** I'm working on this request: checking the gemstone serial.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## verification.lookup.completed

- Module: verification
- Trigger: Use the permission-checked verification.lookup workflow. The authoritative backend confirms the exact result described: The serial verification result is ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Public gemstone verification (/erp/packaging/logs; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The serial verification result is ready.

**friendly:** The serial check is ready. Review the recorded verification result.

**detailed:** The serial verification result is ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in public gemstone verification?


## verification.lookup.failed

- Module: verification
- Trigger: Use the permission-checked verification.lookup workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Public gemstone verification (/erp/packaging/logs; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: checking the gemstone serial.

**friendly:** Something interrupted checking the gemstone serial. Please review the record before repeating it.

**detailed:** This request needs review: checking the gemstone serial. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: checking the gemstone serial. Check the record before repeating the action.

**followUp:** Shall we review public gemstone verification and check the next safe step?


## verification.batch.started

- Module: verification
- Trigger: Use the permission-checked verification.batch workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Public gemstone verification (/erp/packaging/logs; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Checking the selected serials…

**friendly:** This request is in progress: checking the selected serials. I'll wait for its confirmed result.

**detailed:** I'm working on this request: checking the selected serials.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## verification.batch.completed

- Module: verification
- Trigger: Use the permission-checked verification.batch workflow. The authoritative backend confirms the exact result described: The serial-check results are ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Public gemstone verification (/erp/packaging/logs; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** The serial-check results are ready.

**friendly:** Your serial-check results are ready to review.

**detailed:** The serial-check results are ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in public gemstone verification?


## verification.batch.failed

- Module: verification
- Trigger: Use the permission-checked verification.batch workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Public gemstone verification (/erp/packaging/logs; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** I couldn't confirm the result: checking the selected serials.

**friendly:** Something interrupted checking the selected serials. Please review the record before repeating it.

**detailed:** This request needs review: checking the selected serials. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: checking the selected serials. Check the record before repeating the action.

**followUp:** Shall we review public gemstone verification and check the next safe step?


## company.update.started

- Module: company
- Trigger: Use the permission-checked company.update workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Company and branding (/settings/company; settings:manage)
- Sources: app/(dashboard)/settings/company/actions.ts

**short:** Saving company information…

**friendly:** I'm saving company information. I'll share the confirmed result.

**detailed:** I'm working on this request: saving company information.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## company.update.completed

- Module: company
- Trigger: Use the permission-checked company.update workflow. The authoritative backend confirms the exact result described: Your company information has been updated. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Company and branding (/settings/company; settings:manage)
- Sources: app/(dashboard)/settings/company/actions.ts

**short:** Your company information has been updated.

**friendly:** Your company details are saved for use by the existing ERP documents.

**detailed:** Your company information has been updated.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in company and branding?


## company.update.failed

- Module: company
- Trigger: Use the permission-checked company.update workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Company and branding (/settings/company; settings:manage)
- Sources: app/(dashboard)/settings/company/actions.ts

**short:** I couldn't confirm the result: saving company information.

**friendly:** I couldn't finish saving company information. Shall we check the existing record before trying again?

**detailed:** This request needs review: saving company information. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving company information. Check the record before repeating the action.

**followUp:** Shall we review company and branding and check the next safe step?


## company.logo.started

- Module: company
- Trigger: Use the permission-checked company.logo workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Company and branding (/settings/company; settings:manage)
- Sources: app/api/company/branding/route.ts

**short:** Updating company branding…

**friendly:** Let me take care of this step: updating company branding.

**detailed:** I'm working on this request: updating company branding.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## company.logo.completed

- Module: company
- Trigger: Use the permission-checked company.logo workflow. The authoritative backend confirms the exact result described: Your company branding has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Company and branding (/settings/company; settings:manage)
- Sources: app/api/company/branding/route.ts

**short:** Your company branding has been saved.

**friendly:** Your branding is saved. Let's check how it appears in the ERP.

**detailed:** Your company branding has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in company and branding?


## company.logo.failed

- Module: company
- Trigger: Use the permission-checked company.logo workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Company and branding (/settings/company; settings:manage)
- Sources: app/api/company/branding/route.ts

**short:** I couldn't confirm the result: updating company branding.

**friendly:** I noticed a problem while updating company branding. Shall we review the details?

**detailed:** This request needs review: updating company branding. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: updating company branding. Check the record before repeating the action.

**followUp:** Shall we review company and branding and check the next safe step?


## dashboard.layout.started

- Module: dashboard
- Trigger: Use the permission-checked dashboard.layout workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Business overview (/; authenticated owner/session)
- Sources: app/actions/dashboard-layout.ts

**short:** Saving your workspace layout…

**friendly:** I'm saving your workspace layout. I'll share the confirmed result.

**detailed:** I'm working on this request: saving your workspace layout.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## dashboard.layout.completed

- Module: dashboard
- Trigger: Use the permission-checked dashboard.layout workflow. The authoritative backend confirms the exact result described: Your workspace layout has been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Business overview (/; authenticated owner/session)
- Sources: app/actions/dashboard-layout.ts

**short:** Your workspace layout has been saved.

**friendly:** Your workspace layout is saved just the way you arranged it.

**detailed:** Your workspace layout has been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in business overview?


## dashboard.layout.failed

- Module: dashboard
- Trigger: Use the permission-checked dashboard.layout workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Business overview (/; authenticated owner/session)
- Sources: app/actions/dashboard-layout.ts

**short:** I couldn't confirm the result: saving your workspace layout.

**friendly:** I couldn't finish saving your workspace layout. Shall we check the existing record before trying again?

**detailed:** This request needs review: saving your workspace layout. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving your workspace layout. Check the record before repeating the action.

**followUp:** Shall we review business overview and check the next safe step?


## dashboard.shortcut.started

- Module: dashboard
- Trigger: Use the permission-checked dashboard.shortcut workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review Business overview (/; authenticated owner/session)
- Sources: app/actions/dashboard-layout.ts

**short:** Saving your shortcut preferences…

**friendly:** Let me take care of this step: saving your shortcut preferences.

**detailed:** I'm working on this request: saving your shortcut preferences.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## dashboard.shortcut.completed

- Module: dashboard
- Trigger: Use the permission-checked dashboard.shortcut workflow. The authoritative backend confirms the exact result described: Your shortcut preferences have been saved. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review Business overview (/; authenticated owner/session)
- Sources: app/actions/dashboard-layout.ts

**short:** Your shortcut preferences have been saved.

**friendly:** Your shortcuts are saved and ready for your next visit.

**detailed:** Your shortcut preferences have been saved.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in business overview?


## dashboard.shortcut.failed

- Module: dashboard
- Trigger: Use the permission-checked dashboard.shortcut workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review Business overview (/; authenticated owner/session)
- Sources: app/actions/dashboard-layout.ts

**short:** I couldn't confirm the result: saving your shortcut preferences.

**friendly:** I noticed a problem while saving your shortcut preferences. Shall we review the details?

**detailed:** This request needs review: saving your shortcut preferences. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: saving your shortcut preferences. Check the record before repeating the action.

**followUp:** Shall we review business overview and check the next safe step?


## search.query.started

- Module: search
- Trigger: Use the permission-checked search.query workflow. The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.
- Severity / expression: informational / thinking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / activity, companion
- Dynamic variables: record_label
- Available actions: Review ERP search (/search; authenticated owner/session)
- Sources: app/api/search/route.ts

**short:** Searching permitted ERP records…

**friendly:** Let me take care of this step: searching permitted erp records.

**detailed:** I'm working on this request: searching permitted erp records.[[ Reference: {record_label}.]]

**followUp:** You can keep working. Review the result once processing has finished.


## search.query.completed

- Module: search
- Trigger: Use the permission-checked search.query workflow. The authoritative backend confirms the exact result described: The search results are ready. Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.
- Severity / expression: success / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label, affected_count, context_summary
- Available actions: Review ERP search (/search; authenticated owner/session)
- Sources: app/api/search/route.ts

**short:** The search results are ready.

**friendly:** Your search is ready. I'll show only the records your account can access.

**detailed:** The search results are ready.[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Would you like to review this in erp search?


## search.query.failed

- Module: search
- Trigger: Use the permission-checked search.query workflow. The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: activity / toast, activity, companion
- Dynamic variables: record_label
- Available actions: Review ERP search (/search; authenticated owner/session)
- Sources: app/api/search/route.ts

**short:** I couldn't confirm the result: searching permitted erp records.

**friendly:** I noticed a problem while searching permitted erp records. Shall we review the details?

**detailed:** This request needs review: searching permitted erp records. A successful result was not confirmed.[[ Reference: {record_label}.]]

**urgent:** Please review this before continuing: searching permitted erp records. Check the record before repeating the action.

**followUp:** Shall we review erp search and check the next safe step?


## general.introduction

- Module: general
- Trigger: First introduction for this signed-in account on this browser; never on each navigation.
- Severity / expression: informational / greeting
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** I'm Khyra! How can I make your work easier today?

**friendly:** I'm Khyra! How can I make your work easier today?

**detailed:** I'm Khyra, your KhyatiGems Companion. I can help you review permitted updates and choose your next step.

**followUp:** Shall we explore your business tools?


## general.returning

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / greeting
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Welcome back!

**friendly:** Welcome back! What would you like to work on next?

**detailed:** Welcome back! What would you like to work on next? Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.morning

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / greeting
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Good morning!

**friendly:** Good morning! Shall we see what needs your attention today?

**detailed:** Good morning! Shall we see what needs your attention today? Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.afternoon

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / greeting
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Good afternoon!

**friendly:** Good afternoon! Ready to pick up your next task?

**detailed:** Good afternoon! Ready to pick up your next task? Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.evening

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / greeting
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Good evening!

**friendly:** Good evening! Shall we review where things stand?

**detailed:** Good evening! Shall we review where things stand? Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.welcome_back

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / greeting
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Ready when you are.

**friendly:** Welcome back. Your updates are here whenever you'd like to review them.

**detailed:** Welcome back. Your updates are here whenever you'd like to review them. Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.inactivity_return

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / greeting
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Nice to see you back.

**friendly:** Ready to continue? We can pick up with your current work.

**detailed:** Ready to continue? We can pick up with your current work. Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.help

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** How can I help?

**friendly:** What would make your next step easier? Your permitted shortcuts are right here.

**detailed:** What would make your next step easier? Your permitted shortcuts are right here. Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.acknowledgement

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Of course.

**friendly:** Of course. Let's take this one step at a time.

**detailed:** Of course. Let's take this one step at a time. Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.farewell

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** See you next time.

**friendly:** That's all for now. I'll be here when you're ready to continue.

**detailed:** That's all for now. I'll be here when you're ready to continue. Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.idle

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / idle
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Ready whenever you are.

**friendly:** I'm here if you'd like a hand with your next review.

**detailed:** I'm here if you'd like a hand with your next review. Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.daily_review

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Shall we review your business?

**friendly:** Ready for a quick business review? I'll use the latest permitted records.

**detailed:** Ready for a quick business review? I'll use the latest permitted records. Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.quiet

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / rest
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Resting quietly.

**friendly:** I'll stay quiet. Open my tools whenever you need me.

**detailed:** I'll stay quiet. Open my tools whenever you need me. Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.snoozed

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / rest
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / manual, companion
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Alerts are snoozed.

**friendly:** I'll pause these interruptions for the time you selected. Your history stays available.

**detailed:** I'll pause these interruptions for the time you selected. Your history stays available. Your permitted updates and tools are here whenever you want to review them.

**followUp:** Open the existing tools whenever you're ready.


## general.result_unconfirmed

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** The result needs checking.

**friendly:** The connection dropped, so I can't confirm the result. Please check the record before trying again.

**detailed:** The request acknowledgement was unavailable. The operation may or may not have committed; don't repeat a payment, sale or other mutation until its existing record is checked.

**followUp:** Shall we check the record and its recent activity?


## general.recovery_verified

- Module: general
- Trigger: A stored resolvedAt exists only after independently verified successful recovery; never from reading or acknowledgement.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Recovery confirmed.

**friendly:** That issue has a verified recovery. You can review the history whenever you'd like.

**detailed:** A successful recovery was independently confirmed.[[ Earlier update: {context_summary}]]

**followUp:** Would you like to review the recovery history?


## general.read

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Update marked as read.

**friendly:** I've marked that update as read. Acknowledgement and resolution remain separate.

**detailed:** Only this signed-in user's read state was changed. No operational recovery is implied.

**followUp:** You can acknowledge the issue separately if appropriate.


## general.acknowledged

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** Acknowledgement saved.

**friendly:** I've recorded your acknowledgement. The issue stays open until recovery is verified.

**detailed:** Acknowledgement records the user's explicit review, not independent resolution.

**followUp:** Use the existing record to review any remaining work.


## general.permission

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** This action needs permission.

**friendly:** Your account doesn't have access to that action. An authorised administrator can review your permissions.

**detailed:** The existing server permission check denied the requested action. No restricted business information is included.

**followUp:** Please ask an authorised administrator to review access.


## general.connection

- Module: general
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: none
- Available actions: Review Khyra (/; authenticated owner/session)
- Sources: components/companion/companion.tsx

**short:** The connection needs a check.

**friendly:** I'm having trouble reaching the ERP. Your recent work needs a result check before you retry.

**detailed:** The server connection was unavailable. This is not proof that a mutation failed or that an existing record changed.

**followUp:** Check your connection, then review the current record.


## inventory.images_missing

- Module: inventory
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Product photographs need review.

**friendly:** I noticed some gemstones are missing photographs. Shall we review them?

**detailed:** In-stock products have no primary image or IMAGE/image media.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## inventory.certificates_missing

- Module: inventory
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / alert
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Certificate details need review.

**friendly:** I noticed some gemstones are missing certificate numbers. Would you like to review them?

**detailed:** Both certificate-number fields are empty after trimming whitespace.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## inventory.details_missing

- Module: inventory
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** Some gemstone details need a look.

**friendly:** A few required product details need checking before the next step.

**detailed:** Existing completeness validation found missing required product information.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## inventory.duplicate

- Module: inventory
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: View Inventory (/inventory; inventory:view)
- Sources: app/(dashboard)/inventory/actions.ts

**short:** A possible duplicate needs review.

**friendly:** This looks like a record that may already exist. Shall we compare the details before continuing?

**detailed:** The existing duplicate check returned a match. A possible match is not a confirmed duplicate deletion instruction.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## orders.attention

- Module: orders
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** An order needs attention.

**friendly:** This order needs a closer look. Shall we review the details?

**detailed:** The authorised order source reports a condition requiring review.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## marketplace.sync.issue

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: marketplace_name, affected_count, context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/sync-jobs.ts

**short:** Your marketplace sync needs a look.

**friendly:** Oh! Your[[ {marketplace_name}]] marketplace sync didn't finish cleanly. Shall we review it before trying again?

**detailed:** A saved marketplace job failed or completed with record errors.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## marketplace.jobs_stuck

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/sync-jobs.ts

**short:** Marketplace jobs need review.

**friendly:** I found marketplace jobs that need a progress check. Shall we review the history?

**detailed:** The user's saved jobs failed, completed partially, or stopped updating beyond the configured stale threshold.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## reports.exports_failed

- Module: reports
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: View Reports (/reports; reports:view)
- Sources: lib/export-job-processor.ts

**short:** Some exports need review.

**friendly:** I found export jobs that couldn't be prepared. Would you like to review them?

**detailed:** The authorised report job source returned FAILED jobs for the current user.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## receivables.outstanding

- Module: receivables
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: Review Receivables (/reports/receivables; receivables:view)
- Sources: app/api/reports/receivables/route.ts

**short:** Receivables need review.

**friendly:** There are recorded receivables to review. Shall we open the existing report?

**detailed:** The permission-filtered receivables source reports outstanding balances; no financial amount is inferred.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## packaging.attention

- Module: packaging
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: Review Packaging (/erp/packaging; packaging:view)
- Sources: app/erp/packaging/actions.ts

**short:** Packaging details need review.

**friendly:** Some selected items need packaging details before you continue.

**detailed:** The existing packaging eligibility check returned actionable validation issues.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## communications.delivery_failed

- Module: communications
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: Review Email and communications (/communication; communication:view)
- Sources: lib/email/email-service.ts

**short:** Message delivery needs attention.

**friendly:** The delivery service couldn't deliver that message. Shall we review the existing message record?

**detailed:** A verified provider failure or existing terminal delivery state is present; queue acceptance alone is not delivery.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## quotations.expiring

- Module: quotations
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: Review Quotations (/quotes; quotations:view)
- Sources: app/(dashboard)/quotes/actions.ts

**short:** A quotation needs a timely review.

**friendly:** A quotation is approaching its recorded expiry. Would you like to review it?

**detailed:** The saved quotation expiry is within the configured review window.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## reminders.approaching

- Module: reminders
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: Review Follow-ups and reminders (/reports/receivables; receivables:view)
- Sources: app/api/followups/[id]/route.ts

**short:** A follow-up is approaching.

**friendly:** Your recorded follow-up time is approaching. Shall we open the details?

**detailed:** The saved follow-up date falls inside the configured reminder window.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## reminders.overdue

- Module: reminders
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: Review Follow-ups and reminders (/reports/receivables; receivables:view)
- Sources: app/api/followups/[id]/route.ts

**short:** A follow-up is overdue.

**friendly:** A recorded follow-up is overdue. Would you like to review its next step?

**detailed:** The stored follow-up due time is past and no verified completion is present.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## security.review

- Module: security
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: critical / alert
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: affected_count, context_summary
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Your account needs a security review.

**friendly:** Please review this security update before continuing with sensitive work.

**detailed:** A verified security event requires attention. No credentials or recovery secrets are included.[[ Verified affected records: {affected_count}.]][[ {context_summary}]]

**followUp:** Let's open the existing record and check the next appropriate action.

**urgent:** Please review this important issue before continuing. Use the existing authorised workflow.


## orders.received

- Module: orders
- Trigger: A genuinely new order was committed, not an existing order updated by repeated sync.
- Severity / expression: success / happy
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: order_number
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** A new order is recorded.

**friendly:** Great news! A new order has arrived.[[ Order {order_number} is ready to review.]]

**detailed:** A new marketplace order was saved using the existing unique marketplace order identity.[[ Reference: {order_number}.]]

**followUp:** Shall we review the order's next step?


## orders.processing

- Module: orders
- Trigger: The stored marketplace order or raw provider status explicitly confirms this exact state. Never derive shipment or delivery from label generation.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: order_number, context_summary
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** The order is being processed.

**friendly:** Your order is in processing. I'll wait for a confirmed next step.

**detailed:** The order is being processed.[[ Order: {order_number}.]][[ {context_summary}]]

**followUp:** Open the authorised order record to review the source status.


## orders.ready

- Module: orders
- Trigger: The stored marketplace order or raw provider status explicitly confirms this exact state. Never derive shipment or delivery from label generation.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: order_number, context_summary
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** The order is ready for dispatch review.

**friendly:** This order is marked ready for dispatch. Shall we check its fulfilment details?

**detailed:** The order is ready for dispatch review.[[ Order: {order_number}.]][[ {context_summary}]]

**followUp:** Open the authorised order record to review the source status.


## orders.shipped

- Module: orders
- Trigger: The stored marketplace order or raw provider status explicitly confirms this exact state. Never derive shipment or delivery from label generation.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: tracking_code, order_number, context_summary
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** Shipment confirmed.

**friendly:** The source confirms this order has shipped.[[ Tracking: {tracking_code}.]]

**detailed:** Shipment confirmed.[[ Order: {order_number}.]][[ {context_summary}]]

**followUp:** Open the authorised order record to review the source status.


## orders.delivered

- Module: orders
- Trigger: The stored marketplace order or raw provider status explicitly confirms this exact state. Never derive shipment or delivery from label generation.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: order_number, context_summary
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** Delivery confirmed.

**friendly:** The source confirms this order was delivered. You can review the delivery details.

**detailed:** Delivery confirmed.[[ Order: {order_number}.]][[ {context_summary}]]

**followUp:** Open the authorised order record to review the source status.


## orders.cancelled

- Module: orders
- Trigger: The stored marketplace order or raw provider status explicitly confirms this exact state. Never derive shipment or delivery from label generation.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: order_number, context_summary
- Available actions: Open Orders (/marketplace-orders; listings:view)
- Sources: lib/marketplace/sync-orders.ts

**short:** Order cancellation confirmed.

**friendly:** The source confirms the order was cancelled. Let's review any related stock or payment follow-up.

**detailed:** Order cancellation confirmed.[[ Order: {order_number}.]][[ {context_summary}]]

**followUp:** Open the authorised order record to review the source status.


## bookings.created

- Module: bookings
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your booking has been created.

**friendly:** Here is your update. Your booking has been created.

**detailed:** Your booking has been created.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## bookings.confirmed

- Module: bookings
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your booking is confirmed.

**friendly:** Here is your update. Your booking is confirmed.

**detailed:** Your booking is confirmed.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## bookings.rescheduled

- Module: bookings
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your booking has been rescheduled.

**friendly:** Here is your update. Your booking has been rescheduled.

**detailed:** Your booking has been rescheduled.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## bookings.cancelled

- Module: bookings
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your booking has been cancelled.

**friendly:** Here is your update. Your booking has been cancelled.

**detailed:** Your booking has been cancelled.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## shipping.shipment_created

- Module: shipping
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your shipment has been created.

**friendly:** Here is your update. Your shipment has been created.

**detailed:** Your shipment has been created.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## shipping.label_generated

- Module: shipping
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your shipping label is ready.

**friendly:** Here is your update. Your shipping label is ready.

**detailed:** Your shipping label is ready.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## shipping.dispatched

- Module: shipping
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The carrier confirmed dispatch.

**friendly:** Here is your update. The carrier confirmed dispatch.

**detailed:** The carrier confirmed dispatch.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## shipping.tracking_updated

- Module: shipping
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The tracking details have been updated.

**friendly:** Here is your update. The tracking details have been updated.

**detailed:** The tracking details have been updated.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## shipping.delivered

- Module: shipping
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The carrier confirmed delivery.

**friendly:** Here is your update. The carrier confirmed delivery.

**detailed:** The carrier confirmed delivery.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## shipping.delayed

- Module: shipping
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your shipment needs a delay review.

**friendly:** Please take a look. Your shipment needs a delay review.

**detailed:** Your shipment needs a delay review.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.

**urgent:** Please review this issue before continuing. Your shipment needs a delay review.


## shipping.label_failed

- Module: shipping
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The shipping label couldn't be prepared.

**friendly:** Please take a look. The shipping label couldn't be prepared.

**detailed:** The shipping label couldn't be prepared.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.

**urgent:** Please review this issue before continuing. The shipping label couldn't be prepared.


## shipping.courier_issue

- Module: shipping
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your courier connection needs review.

**friendly:** Please take a look. Your courier connection needs review.

**detailed:** Your courier connection needs review.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.

**urgent:** Please review this issue before continuing. Your courier connection needs review.


## tasks.created

- Module: tasks
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your task has been created.

**friendly:** Here is your update. Your task has been created.

**detailed:** Your task has been created.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## tasks.completed

- Module: tasks
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your task is complete.

**friendly:** Here is your update. Your task is complete.

**detailed:** Your task is complete.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## tasks.overdue

- Module: tasks
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** A recorded task is overdue.

**friendly:** Please take a look. A recorded task is overdue.

**detailed:** A recorded task is overdue.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.

**urgent:** Please review this issue before continuing. A recorded task is overdue.


## tasks.reminder

- Module: tasks
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your task reminder is approaching.

**friendly:** Here is your update. Your task reminder is approaching.

**detailed:** Your task reminder is approaching.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## backup.started

- Module: backup
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your backup has started.

**friendly:** Here is your update. Your backup has started.

**detailed:** Your backup has started.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## backup.completed

- Module: backup
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Your backup is complete.

**friendly:** Here is your update. Your backup is complete.

**detailed:** Your backup is complete.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.


## backup.failed

- Module: backup
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** The backup couldn't be confirmed.

**friendly:** Please take a look. The backup couldn't be confirmed.

**detailed:** The backup couldn't be confirmed.[[ {context_summary}]]

**followUp:** Review the confirmed details before choosing the next step.

**urgent:** Please review this issue before continuing. The backup couldn't be confirmed.


## marketplace.ebay.account_connected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: The account connection is confirmed.

**friendly:** eBay: Your account is connected. Shall we review its settings?

**detailed:** eBay: The account connection is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.ebay.account_disconnected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: The account is disconnected.

**friendly:** eBay: The account is disconnected as requested.

**detailed:** eBay: The account is disconnected.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.ebay.authentication_expired

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: Authentication needs renewal.

**friendly:** eBay: The saved access has expired or was rejected. Let's review the connection.

**detailed:** eBay: Authentication needs renewal.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** eBay: please review this issue before repeating the operation.


## marketplace.ebay.sync_started

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: Synchronisation is in progress.

**friendly:** eBay: The sync has started. I'll wait for the confirmed result.

**detailed:** eBay: Synchronisation is in progress.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.ebay.sync_completed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: Synchronisation completed.

**friendly:** eBay: Your sync is complete. Shall we review the result?

**detailed:** eBay: Synchronisation completed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.ebay.sync_failed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: Synchronisation needs attention.

**friendly:** eBay: The sync didn't finish successfully. Shall we review the existing retry options?

**detailed:** eBay: Synchronisation needs attention.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** eBay: please review this issue before repeating the operation.


## marketplace.ebay.listing_published

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: Publication is confirmed.

**friendly:** eBay: The provider confirmed your listing was published. Shall we review it?

**detailed:** eBay: Publication is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.ebay.listing_updated

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: The listing has been updated.

**friendly:** eBay: Your listing update is confirmed by the provider.

**detailed:** eBay: The listing has been updated.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.ebay.listing_rejected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: The listing needs a correction.

**friendly:** eBay: The provider rejected this listing. Shall we review the reported requirements?

**detailed:** eBay: The listing needs a correction.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** eBay: please review this issue before repeating the operation.


## marketplace.ebay.listing_attention

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / alert
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: The listing needs review.

**friendly:** eBay: This listing needs a closer look before the next step.

**detailed:** eBay: The listing needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** eBay: please review this issue before repeating the operation.


## marketplace.ebay.api_error

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: The marketplace request needs review.

**friendly:** eBay: The marketplace request couldn't finish cleanly. Let's check its existing record.

**detailed:** eBay: The marketplace request needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** eBay: please review this issue before repeating the operation.


## marketplace.ebay.bulk_listing

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: The listing batch result is ready.

**friendly:** eBay: The batch result is ready. Please review individual successes and failures.

**detailed:** eBay: The listing batch result is ready.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.ebay.permission_issue

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/ebay.ts, lib/marketplace/sync-jobs.ts

**short:** eBay: Marketplace access needs review.

**friendly:** eBay: The provider didn't allow that action. Please review the account's approved permissions.

**detailed:** eBay: Marketplace access needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** eBay: please review this issue before repeating the operation.


## marketplace.etsy.account_connected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: The account connection is confirmed.

**friendly:** Etsy: Your account is connected. Shall we review its settings?

**detailed:** Etsy: The account connection is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.etsy.account_disconnected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: The account is disconnected.

**friendly:** Etsy: The account is disconnected as requested.

**detailed:** Etsy: The account is disconnected.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.etsy.authentication_expired

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: Authentication needs renewal.

**friendly:** Etsy: The saved access has expired or was rejected. Let's review the connection.

**detailed:** Etsy: Authentication needs renewal.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Etsy: please review this issue before repeating the operation.


## marketplace.etsy.sync_started

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / working
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: Synchronisation is in progress.

**friendly:** Etsy: The sync has started. I'll wait for the confirmed result.

**detailed:** Etsy: Synchronisation is in progress.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.etsy.sync_completed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: Synchronisation completed.

**friendly:** Etsy: Your sync is complete. Shall we review the result?

**detailed:** Etsy: Synchronisation completed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.etsy.sync_failed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: Synchronisation needs attention.

**friendly:** Etsy: The sync didn't finish successfully. Shall we review the existing retry options?

**detailed:** Etsy: Synchronisation needs attention.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Etsy: please review this issue before repeating the operation.


## marketplace.etsy.listing_published

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: Publication is confirmed.

**friendly:** Etsy: The provider confirmed your listing was published. Shall we review it?

**detailed:** Etsy: Publication is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.etsy.listing_updated

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: The listing has been updated.

**friendly:** Etsy: Your listing update is confirmed by the provider.

**detailed:** Etsy: The listing has been updated.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.etsy.listing_rejected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: The listing needs a correction.

**friendly:** Etsy: The provider rejected this listing. Shall we review the reported requirements?

**detailed:** Etsy: The listing needs a correction.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Etsy: please review this issue before repeating the operation.


## marketplace.etsy.listing_attention

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / alert
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: The listing needs review.

**friendly:** Etsy: This listing needs a closer look before the next step.

**detailed:** Etsy: The listing needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Etsy: please review this issue before repeating the operation.


## marketplace.etsy.api_error

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: The marketplace request needs review.

**friendly:** Etsy: The marketplace request couldn't finish cleanly. Let's check its existing record.

**detailed:** Etsy: The marketplace request needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Etsy: please review this issue before repeating the operation.


## marketplace.etsy.bulk_listing

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: The listing batch result is ready.

**friendly:** Etsy: The batch result is ready. Please review individual successes and failures.

**detailed:** Etsy: The listing batch result is ready.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.etsy.permission_issue

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Sync History (/marketplace-sync-history; listings:view)
- Sources: lib/marketplace/connectors/etsy.ts, lib/marketplace/sync-jobs.ts

**short:** Etsy: Marketplace access needs review.

**friendly:** Etsy: The provider didn't allow that action. Please review the account's approved permissions.

**detailed:** Etsy: Marketplace access needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Etsy: please review this issue before repeating the operation.


## marketplace.shopify.account_connected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: The account connection is confirmed.

**friendly:** Shopify: Your account is connected. Shall we review its settings?

**detailed:** Shopify: The account connection is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.shopify.account_disconnected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: The account is disconnected.

**friendly:** Shopify: The account is disconnected as requested.

**detailed:** Shopify: The account is disconnected.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.shopify.authentication_expired

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: Authentication needs renewal.

**friendly:** Shopify: The saved access has expired or was rejected. Let's review the connection.

**detailed:** Shopify: Authentication needs renewal.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Shopify: please review this issue before repeating the operation.


## marketplace.shopify.sync_started

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: Synchronisation is in progress.

**friendly:** Shopify: The sync has started. I'll wait for the confirmed result.

**detailed:** Shopify: Synchronisation is in progress.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.shopify.sync_completed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: Synchronisation completed.

**friendly:** Shopify: Your sync is complete. Shall we review the result?

**detailed:** Shopify: Synchronisation completed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.shopify.sync_failed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: Synchronisation needs attention.

**friendly:** Shopify: The sync didn't finish successfully. Shall we review the existing retry options?

**detailed:** Shopify: Synchronisation needs attention.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Shopify: please review this issue before repeating the operation.


## marketplace.shopify.listing_published

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: Publication is confirmed.

**friendly:** Shopify: The provider confirmed your listing was published. Shall we review it?

**detailed:** Shopify: Publication is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.shopify.listing_updated

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: The listing has been updated.

**friendly:** Shopify: Your listing update is confirmed by the provider.

**detailed:** Shopify: The listing has been updated.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.shopify.listing_rejected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: The listing needs a correction.

**friendly:** Shopify: The provider rejected this listing. Shall we review the reported requirements?

**detailed:** Shopify: The listing needs a correction.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Shopify: please review this issue before repeating the operation.


## marketplace.shopify.listing_attention

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / alert
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: The listing needs review.

**friendly:** Shopify: This listing needs a closer look before the next step.

**detailed:** Shopify: The listing needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Shopify: please review this issue before repeating the operation.


## marketplace.shopify.api_error

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: The marketplace request needs review.

**friendly:** Shopify: The marketplace request couldn't finish cleanly. Let's check its existing record.

**detailed:** Shopify: The marketplace request needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Shopify: please review this issue before repeating the operation.


## marketplace.shopify.bulk_listing

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: The listing batch result is ready.

**friendly:** Shopify: The batch result is ready. Please review individual successes and failures.

**detailed:** Shopify: The listing batch result is ready.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.shopify.permission_issue

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Shopify: Marketplace access needs review.

**friendly:** Shopify: The provider didn't allow that action. Please review the account's approved permissions.

**detailed:** Shopify: Marketplace access needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Shopify: please review this issue before repeating the operation.


## marketplace.amazon.account_connected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: The account connection is confirmed.

**friendly:** Amazon: Your account is connected. Shall we review its settings?

**detailed:** Amazon: The account connection is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.amazon.account_disconnected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: The account is disconnected.

**friendly:** Amazon: The account is disconnected as requested.

**detailed:** Amazon: The account is disconnected.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.amazon.authentication_expired

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: Authentication needs renewal.

**friendly:** Amazon: The saved access has expired or was rejected. Let's review the connection.

**detailed:** Amazon: Authentication needs renewal.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Amazon: please review this issue before repeating the operation.


## marketplace.amazon.sync_started

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: Synchronisation is in progress.

**friendly:** Amazon: The sync has started. I'll wait for the confirmed result.

**detailed:** Amazon: Synchronisation is in progress.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.amazon.sync_completed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: Synchronisation completed.

**friendly:** Amazon: Your sync is complete. Shall we review the result?

**detailed:** Amazon: Synchronisation completed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.amazon.sync_failed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: Synchronisation needs attention.

**friendly:** Amazon: The sync didn't finish successfully. Shall we review the existing retry options?

**detailed:** Amazon: Synchronisation needs attention.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Amazon: please review this issue before repeating the operation.


## marketplace.amazon.listing_published

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: Publication is confirmed.

**friendly:** Amazon: The provider confirmed your listing was published. Shall we review it?

**detailed:** Amazon: Publication is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.amazon.listing_updated

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: The listing has been updated.

**friendly:** Amazon: Your listing update is confirmed by the provider.

**detailed:** Amazon: The listing has been updated.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.amazon.listing_rejected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: The listing needs a correction.

**friendly:** Amazon: The provider rejected this listing. Shall we review the reported requirements?

**detailed:** Amazon: The listing needs a correction.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Amazon: please review this issue before repeating the operation.


## marketplace.amazon.listing_attention

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / alert
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: The listing needs review.

**friendly:** Amazon: This listing needs a closer look before the next step.

**detailed:** Amazon: The listing needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Amazon: please review this issue before repeating the operation.


## marketplace.amazon.api_error

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: The marketplace request needs review.

**friendly:** Amazon: The marketplace request couldn't finish cleanly. Let's check its existing record.

**detailed:** Amazon: The marketplace request needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Amazon: please review this issue before repeating the operation.


## marketplace.amazon.bulk_listing

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: The listing batch result is ready.

**friendly:** Amazon: The batch result is ready. Please review individual successes and failures.

**detailed:** Amazon: The listing batch result is ready.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.amazon.permission_issue

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Amazon: Marketplace access needs review.

**friendly:** Amazon: The provider didn't allow that action. Please review the account's approved permissions.

**detailed:** Amazon: Marketplace access needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Amazon: please review this issue before repeating the operation.


## marketplace.pinterest.account_connected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: The account connection is confirmed.

**friendly:** Pinterest: Your account is connected. Shall we review its settings?

**detailed:** Pinterest: The account connection is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.pinterest.account_disconnected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: The account is disconnected.

**friendly:** Pinterest: The account is disconnected as requested.

**detailed:** Pinterest: The account is disconnected.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.pinterest.authentication_expired

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: Authentication needs renewal.

**friendly:** Pinterest: The saved access has expired or was rejected. Let's review the connection.

**detailed:** Pinterest: Authentication needs renewal.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Pinterest: please review this issue before repeating the operation.


## marketplace.pinterest.sync_started

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: Synchronisation is in progress.

**friendly:** Pinterest: The sync has started. I'll wait for the confirmed result.

**detailed:** Pinterest: Synchronisation is in progress.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.pinterest.sync_completed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: Synchronisation completed.

**friendly:** Pinterest: Your sync is complete. Shall we review the result?

**detailed:** Pinterest: Synchronisation completed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.pinterest.sync_failed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: Synchronisation needs attention.

**friendly:** Pinterest: The sync didn't finish successfully. Shall we review the existing retry options?

**detailed:** Pinterest: Synchronisation needs attention.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Pinterest: please review this issue before repeating the operation.


## marketplace.pinterest.listing_published

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: Publication is confirmed.

**friendly:** Pinterest: The provider confirmed your listing was published. Shall we review it?

**detailed:** Pinterest: Publication is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.pinterest.listing_updated

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: The listing has been updated.

**friendly:** Pinterest: Your listing update is confirmed by the provider.

**detailed:** Pinterest: The listing has been updated.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.pinterest.listing_rejected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: The listing needs a correction.

**friendly:** Pinterest: The provider rejected this listing. Shall we review the reported requirements?

**detailed:** Pinterest: The listing needs a correction.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Pinterest: please review this issue before repeating the operation.


## marketplace.pinterest.listing_attention

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / alert
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: The listing needs review.

**friendly:** Pinterest: This listing needs a closer look before the next step.

**detailed:** Pinterest: The listing needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Pinterest: please review this issue before repeating the operation.


## marketplace.pinterest.api_error

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: The marketplace request needs review.

**friendly:** Pinterest: The marketplace request couldn't finish cleanly. Let's check its existing record.

**detailed:** Pinterest: The marketplace request needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Pinterest: please review this issue before repeating the operation.


## marketplace.pinterest.bulk_listing

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: The listing batch result is ready.

**friendly:** Pinterest: The batch result is ready. Please review individual successes and failures.

**detailed:** Pinterest: The listing batch result is ready.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.pinterest.permission_issue

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** Pinterest: Marketplace access needs review.

**friendly:** Pinterest: The provider didn't allow that action. Please review the account's approved permissions.

**detailed:** Pinterest: Marketplace access needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** Pinterest: please review this issue before repeating the operation.


## marketplace.other.account_connected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: The account connection is confirmed.

**friendly:** your connected marketplace: Your account is connected. Shall we review its settings?

**detailed:** your connected marketplace: The account connection is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.other.account_disconnected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: The account is disconnected.

**friendly:** your connected marketplace: The account is disconnected as requested.

**detailed:** your connected marketplace: The account is disconnected.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.other.authentication_expired

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: Authentication needs renewal.

**friendly:** your connected marketplace: The saved access has expired or was rejected. Let's review the connection.

**detailed:** your connected marketplace: Authentication needs renewal.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** your connected marketplace: please review this issue before repeating the operation.


## marketplace.other.sync_started

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / working
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: Synchronisation is in progress.

**friendly:** your connected marketplace: The sync has started. I'll wait for the confirmed result.

**detailed:** your connected marketplace: Synchronisation is in progress.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.other.sync_completed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: Synchronisation completed.

**friendly:** your connected marketplace: Your sync is complete. Shall we review the result?

**detailed:** your connected marketplace: Synchronisation completed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.other.sync_failed

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: Synchronisation needs attention.

**friendly:** your connected marketplace: The sync didn't finish successfully. Shall we review the existing retry options?

**detailed:** your connected marketplace: Synchronisation needs attention.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** your connected marketplace: please review this issue before repeating the operation.


## marketplace.other.listing_published

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: Publication is confirmed.

**friendly:** your connected marketplace: The provider confirmed your listing was published. Shall we review it?

**detailed:** your connected marketplace: Publication is confirmed.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.other.listing_updated

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: The listing has been updated.

**friendly:** your connected marketplace: Your listing update is confirmed by the provider.

**detailed:** your connected marketplace: The listing has been updated.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.other.listing_rejected

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: The listing needs a correction.

**friendly:** your connected marketplace: The provider rejected this listing. Shall we review the reported requirements?

**detailed:** your connected marketplace: The listing needs a correction.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** your connected marketplace: please review this issue before repeating the operation.


## marketplace.other.listing_attention

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / alert
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: The listing needs review.

**friendly:** your connected marketplace: This listing needs a closer look before the next step.

**detailed:** your connected marketplace: The listing needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** your connected marketplace: please review this issue before repeating the operation.


## marketplace.other.api_error

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: The marketplace request needs review.

**friendly:** your connected marketplace: The marketplace request couldn't finish cleanly. Let's check its existing record.

**detailed:** your connected marketplace: The marketplace request needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** your connected marketplace: please review this issue before repeating the operation.


## marketplace.other.bulk_listing

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: informational / speaking
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: The listing batch result is ready.

**friendly:** your connected marketplace: The batch result is ready. Please review individual successes and failures.

**detailed:** your connected marketplace: The listing batch result is ready.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.


## marketplace.other.permission_issue

- Module: marketplace
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / concerned
- Support: Prepared template — not connected to a verified ERP trigger
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: none
- Sources: No verified trigger connected

**short:** your connected marketplace: Marketplace access needs review.

**friendly:** your connected marketplace: The provider didn't allow that action. Please review the account's approved permissions.

**detailed:** your connected marketplace: Marketplace access needs review.[[ {context_summary}]]

**followUp:** Review the existing authorised marketplace record before taking action.

**urgent:** your connected marketplace: please review this issue before repeating the operation.


## security.session_expired

- Module: security
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: none
- Available actions: Open Security Settings (/settings/security; authenticated owner/session)
- Sources: app/api/settings/security/route.ts

**short:** Please sign in again.

**friendly:** Your session has expired. Please sign in again to continue securely.

**detailed:** The authenticated server returned an expired or invalid session. No restricted record information is revealed.

**followUp:** Use the existing sign-in screen to continue.


## governance.frozen

- Module: governance
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: attention / alert
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: none
- Available actions: Review Data freeze and governance (/settings; settings:manage)
- Sources: app/api/governance/status/route.ts

**short:** This change is currently restricted.

**friendly:** The ERP's data-freeze rules don't allow that change right now.

**detailed:** The existing freeze guard blocked a mutation. No alternative path should bypass the guard.

**followUp:** Review the existing governance settings with an authorised administrator.


## integrations.scheduled_completed

- Module: integrations
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: success / success
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: context_summary
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** The scheduled operation is complete.

**friendly:** The scheduled work has a confirmed result. Would you like to review it?

**detailed:** The authoritative background worker saved a successful terminal result.[[ {context_summary}]]

**followUp:** Review the existing job history when you're ready.


## integrations.automation_attention

- Module: integrations
- Trigger: Emit only when this exact condition is confirmed by the existing authorised source.
- Severity / expression: warning / concerned
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: saved_issue / saved, bell, companion, activity
- Dynamic variables: context_summary
- Available actions: Review Integrations and background jobs (/settings/marketplace-connections; settings:manage)
- Sources: app/api/integrations/marketplace/connections/route.ts

**short:** An automation needs review.

**friendly:** An existing automation needs a little attention. Shall we review its job history?

**detailed:** An authorised background-job source reports a failed, partial or stalled state.[[ {context_summary}]]

**followUp:** Use the existing authorised retry or settings workflow.

**urgent:** Please review this automation before relying on its next result.


## reports.view.advance-utilization

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/advance-utilization/page.tsx

**short:** Your advance utilization review is ready.

**friendly:** Here is your advance utilization view. Shall we look at the details?

**detailed:** The authorised advance utilization report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.capital-rotation

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/capital-rotation/page.tsx

**short:** Your capital rotation review is ready.

**friendly:** Here is your capital rotation view. Shall we look at the details?

**detailed:** The authorised capital rotation report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.category-stock

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/category-stock/page.tsx

**short:** Your category stock review is ready.

**friendly:** Here is your category stock view. Shall we look at the details?

**detailed:** The authorised category stock report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.certificate-readiness

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/certificate-readiness/page.tsx

**short:** Your certificate readiness review is ready.

**friendly:** Here is your certificate readiness view. Shall we look at the details?

**detailed:** The authorised certificate readiness report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.customer-advances

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/customer-advances/page.tsx

**short:** Your customer advances review is ready.

**friendly:** Here is your customer advances view. Shall we look at the details?

**detailed:** The authorised customer advances report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.customer-intelligence

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/customer-intelligence/page.tsx

**short:** Your customer intelligence review is ready.

**friendly:** Here is your customer intelligence view. Shall we look at the details?

**detailed:** The authorised customer intelligence report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.discount-usage

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/discount-usage/page.tsx

**short:** Your discount usage review is ready.

**friendly:** Here is your discount usage view. Shall we look at the details?

**detailed:** The authorised discount usage report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.export-payments

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/export-payments/page.tsx

**short:** Your export payments review is ready.

**friendly:** Here is your export payments view. Shall we look at the details?

**detailed:** The authorised export payments report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.gst

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/gst/page.tsx

**short:** Your gst review is ready.

**friendly:** Here is your gst view. Shall we look at the details?

**detailed:** The authorised gst report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.inventory

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/inventory/page.tsx

**short:** Your inventory review is ready.

**friendly:** Here is your inventory view. Shall we look at the details?

**detailed:** The authorised inventory report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.inventory-aging

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/inventory-aging/page.tsx

**short:** Your inventory aging review is ready.

**friendly:** Here is your inventory aging view. Shall we look at the details?

**detailed:** The authorised inventory aging report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.invoices

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/invoices/page.tsx

**short:** Your invoices review is ready.

**friendly:** Here is your invoices view. Shall we look at the details?

**detailed:** The authorised invoices report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.label-printing

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/label-printing/page.tsx

**short:** Your label printing review is ready.

**friendly:** Here is your label printing view. Shall we look at the details?

**detailed:** The authorised label printing report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.loyalty-points

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/loyalty-points/page.tsx

**short:** Your loyalty points review is ready.

**friendly:** Here is your loyalty points view. Shall we look at the details?

**detailed:** The authorised loyalty points report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.missing-media

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/missing-media/page.tsx

**short:** Your missing media review is ready.

**friendly:** Here is your missing media view. Shall we look at the details?

**detailed:** The authorised missing media report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.ops

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/ops/page.tsx

**short:** Your ops review is ready.

**friendly:** Here is your ops view. Shall we look at the details?

**detailed:** The authorised ops report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.payments

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/payments/page.tsx

**short:** Your payments review is ready.

**friendly:** Here is your payments view. Shall we look at the details?

**detailed:** The authorised payments report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.pending-advances

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/pending-advances/page.tsx

**short:** Your pending advances review is ready.

**friendly:** Here is your pending advances view. Shall we look at the details?

**detailed:** The authorised pending advances report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.profit

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/profit/page.tsx

**short:** Your profit review is ready.

**friendly:** Here is your profit view. Shall we look at the details?

**detailed:** The authorised profit report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.purchase-timeline

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/purchase-timeline/page.tsx

**short:** Your purchase timeline review is ready.

**friendly:** Here is your purchase timeline view. Shall we look at the details?

**detailed:** The authorised purchase timeline report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.qr-scans

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/qr-scans/page.tsx

**short:** Your qr scans review is ready.

**friendly:** Here is your qr scans view. Shall we look at the details?

**detailed:** The authorised qr scans report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.quotations

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/quotations/page.tsx

**short:** Your quotations review is ready.

**friendly:** Here is your quotations view. Shall we look at the details?

**detailed:** The authorised quotations report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.receivables

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/receivables/page.tsx

**short:** Your receivables review is ready.

**friendly:** Here is your receivables view. Shall we look at the details?

**detailed:** The authorised receivables report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.sales

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/sales/page.tsx

**short:** Your sales review is ready.

**friendly:** Here is your sales view. Shall we look at the details?

**detailed:** The authorised sales report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.sales-cycle

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/sales-cycle/page.tsx

**short:** Your sales cycle review is ready.

**friendly:** Here is your sales cycle view. Shall we look at the details?

**detailed:** The authorised sales cycle report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.system-logs

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/system-logs/page.tsx

**short:** Your system logs review is ready.

**friendly:** Here is your system logs view. Shall we look at the details?

**detailed:** The authorised system logs report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.top-categories

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/top-categories/page.tsx

**short:** Your top categories review is ready.

**friendly:** Here is your top categories view. Shall we look at the details?

**detailed:** The authorised top categories report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.top-customers

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/top-customers/page.tsx

**short:** Your top customers review is ready.

**friendly:** Here is your top customers view. Shall we look at the details?

**detailed:** The authorised top customers report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.turnover-report

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/turnover-report/page.tsx

**short:** Your turnover report review is ready.

**friendly:** Here is your turnover report view. Shall we look at the details?

**detailed:** The authorised turnover report report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.user-activity

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/user-activity/page.tsx

**short:** Your user activity review is ready.

**friendly:** Here is your user activity view. Shall we look at the details?

**detailed:** The authorised user activity report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.vendor-dependency

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/vendor-dependency/page.tsx

**short:** Your vendor dependency review is ready.

**friendly:** Here is your vendor dependency view. Shall we look at the details?

**detailed:** The authorised vendor dependency report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.vendor-inventory

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/vendor-inventory/page.tsx

**short:** Your vendor inventory review is ready.

**friendly:** Here is your vendor inventory view. Shall we look at the details?

**detailed:** The authorised vendor inventory report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


## reports.view.vendor-purchases

- Module: reports
- Trigger: The permission-filtered report query completed; opening a link alone is not proof that it completed.
- Severity / expression: informational / speaking
- Support: Catalogued from an existing ERP source; emit only after its trigger is confirmed
- Persistence / channels: none / companion, activity
- Dynamic variables: report_period
- Available actions: View Reports (/reports; reports:view)
- Sources: app/(dashboard)/reports/vendor-purchases/page.tsx

**short:** Your vendor purchases review is ready.

**friendly:** Here is your vendor purchases view. Shall we look at the details?

**detailed:** The authorised vendor purchases report query completed.[[ Report period: {report_period}.]]

**followUp:** Review the source dates and filters before making a decision.


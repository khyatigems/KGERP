import { registerConnector } from "@/lib/marketplace/connector";
import { EbayConnector } from "@/lib/marketplace/connectors/ebay";
import { EtsyConnector } from "@/lib/marketplace/connectors/etsy";

registerConnector(new EbayConnector());
registerConnector(new EtsyConnector());

export { EbayConnector } from "@/lib/marketplace/connectors/ebay";
export { EtsyConnector } from "@/lib/marketplace/connectors/etsy";
export * from "@/lib/marketplace/connector";

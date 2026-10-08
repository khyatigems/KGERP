import assert from "node:assert/strict";
import { isLiveMarketplaceListing } from "@/lib/marketplace/listing-status";
import {
  extractEbayShipmentTracking,
  mergeEbayTracking,
  parseEbayActiveListings,
} from "@/lib/marketplace/connectors/ebay";

assert.equal(isLiveMarketplaceListing({ status: "ACTIVE", quantity: 1 }), true);
assert.equal(isLiveMarketplaceListing({ status: "active" }), true);
assert.equal(isLiveMarketplaceListing({ status: "DRAFT" }), false);
assert.equal(isLiveMarketplaceListing({ status: "SOLD" }), false);
assert.equal(isLiveMarketplaceListing({ status: "sold_out" }), false);
assert.equal(isLiveMarketplaceListing({ status: "ENDED" }), false);
assert.equal(isLiveMarketplaceListing({ status: "ACTIVE", quantity: 0 }), false);
assert.equal(isLiveMarketplaceListing({ status: "LISTED", quantity: 1 }), true);

const xml = `
<GetMyeBaySellingResponse>
  <ActiveList>
    <ItemArray>
      <Item>
        <ItemID>111</ItemID>
        <Title>Live ruby</Title>
        <SKU>RB-1</SKU>
        <Quantity>1</Quantity>
        <QuantityAvailable>1</QuantityAvailable>
        <SellingStatus>
          <ListingStatus>Active</ListingStatus>
          <QuantitySold>0</QuantitySold>
          <CurrentPrice currencyID="USD">10.00</CurrentPrice>
        </SellingStatus>
      </Item>
      <Item>
        <ItemID>222</ItemID>
        <Title>Sold out in active feed</Title>
        <Quantity>1</Quantity>
        <QuantityAvailable>0</QuantityAvailable>
        <SellingStatus>
          <ListingStatus>Active</ListingStatus>
          <QuantitySold>1</QuantitySold>
        </SellingStatus>
      </Item>
    </ItemArray>
  </ActiveList>
  <SoldList>
    <ItemArray>
      <Item>
        <ItemID>333</ItemID>
        <Title>Already sold</Title>
        <SellingStatus><ListingStatus>Completed</ListingStatus></SellingStatus>
      </Item>
    </ItemArray>
  </SoldList>
</GetMyeBaySellingResponse>
`;

const parsed = parseEbayActiveListings(xml);
assert.deepEqual(parsed.map((listing) => listing.listingId), ["111", "222"]);
assert.equal(parsed[0].status, "ACTIVE");
assert.equal(parsed[0].quantity, 1);
assert.equal(parsed[1].quantity, 0);

const fromFulfillment = extractEbayShipmentTracking({
  fulfillments: [{
    shipmentTrackingNumber: "1Z999",
    shippingCarrierCode: "UPS",
  }],
});
assert.equal(fromFulfillment.trackingCode, "1Z999");
assert.equal(fromFulfillment.carrier, "UPS");

const fromNested = extractEbayShipmentTracking({
  lineItems: [{
    shipmentTrackingDetails: [{
      shipmentTrackingNumber: "9400 1111",
      shippingCarrierUsed: "USPS",
    }],
  }],
});
assert.equal(fromNested.trackingCode, "9400 1111");
assert.equal(fromNested.carrier, "USPS");

const fromLegacyFields = extractEbayShipmentTracking({
  shipment_tracking_number: "9400 2222",
  shipping_carrier: "USPS",
});
assert.equal(fromLegacyFields.trackingCode, "9400 2222");
assert.equal(fromLegacyFields.carrier, "USPS");

assert.deepEqual(
  mergeEbayTracking(
    { trackingCode: "1Z999", carrier: null },
    { trackingCode: null, carrier: "UPS" }
  ),
  { trackingCode: "1Z999", carrier: "UPS" }
);

console.log("Marketplace listing sync unit tests passed.");

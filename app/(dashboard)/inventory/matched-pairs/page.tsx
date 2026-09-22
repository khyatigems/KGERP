import { Metadata } from "next";
import { InventoryMatchedPairsPage } from "./InventoryMatchedPairsPage";

export const metadata: Metadata = {
  title: "Matched Pairs & Sets | KhyatiGems ERP",
  description: "Find and manage matched pairs and sets of gemstones",
};

export default function MatchedPairsPage() {
  return <InventoryMatchedPairsPage />;
}
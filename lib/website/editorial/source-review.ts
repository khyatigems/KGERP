import { createHash } from "node:crypto";
import type { Content } from "./contract";
export function contentReviewHash(content: Content) {
  const { review: _review, sourceReview: _sourceReview, ...document } = content;
  void _review;
  void _sourceReview;
  return createHash("sha256").update(JSON.stringify(document)).digest("hex");
}
export function validSourceReview(content: Content) {
  return (
    !!content.sourceReview &&
    !!content.sourceReview.actorId &&
    content.sourceReview.contentHash === contentReviewHash(content)
  );
}

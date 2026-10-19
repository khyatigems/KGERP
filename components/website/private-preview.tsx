"use client";
import { renderToStaticMarkup } from "react-dom/server.browser";
import { Homepage } from "./homepage-preview";
import { Article } from "./article-preview";
import { AnnouncementBar, announcementState } from "./announcement-bar";
import type { PublicArticle, PublicFeed } from "@/lib/website/editorial/contract";
type Preview = {css:string;preview:{type:"homepage";feed:PublicFeed}|{type:"article";article:PublicArticle}};
/** Render only the authenticated API's validated preview projection, in the editor browser. */
export function privatePreviewHtml({preview,css}:Preview) {
  const markup=renderToStaticMarkup(preview.type==="article" ? <Article preview article={preview.article} related={[]}/> : <><AnnouncementBar interval={preview.feed.settings.announcementInterval} animation={preview.feed.settings.announcementAnimation} autoplay={preview.feed.settings.announcementAutoplay} announcements={preview.feed.settings.announcements.filter(a=>announcementState(a)==="Live")}/><Homepage preview feed={preview.feed}/></>);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex,nofollow"><style>'+css.replaceAll('</style','<\\/style')+'</style></head><body><aside style="padding:16px;background:#fff3ce;color:#31291a">Private homepage preview / article preview. Unsaved content and pending media may appear here; this does not publish or approve them.</aside><main>'+markup.replaceAll('href="','data-preview-href="')+'</main></body></html>';
}

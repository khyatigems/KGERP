import type { SiteSettings } from "@/lib/website/editorial/contract";
export type Announcement = SiteSettings["announcements"][number];
export function announcementState(a: Announcement, now = Date.now()) {
  if (!a.enabled) return "Disabled";
  if (a.startsAt && a.endsAt && Date.parse(a.endsAt) <= Date.parse(a.startsAt))
    return "Invalid schedule";
  if (a.startsAt && Date.parse(a.startsAt) > now) return "Scheduled";
  if (a.endsAt && Date.parse(a.endsAt) <= now) return "Expired";
  return "Live";
}
export function AnnouncementBar({
  announcements,
}: {
  announcements: Announcement[];
}) {
  return (
    <>
      {announcements.map((a, i) => (
        <aside
          className={`kg-announcement kg-announcement--${["brand", "gold", "neutral"].includes(a.tone) ? a.tone : "brand"}`}
          key={i}
        >
          {a.linkLabel ? (
            <>
              <span>{a.text}</span>
              <a
                href={
                  /^\/(?!\/)[a-zA-Z0-9/\-#?=&]*$/.test(a.href)
                    ? a.href
                    : "/gemstones"
                }
              >
                {a.linkLabel}
                <span aria-hidden="true"> →</span>
              </a>
            </>
          ) : (
            <a
              href={
                /^\/(?!\/)[a-zA-Z0-9/\-#?=&]*$/.test(a.href)
                  ? a.href
                  : "/gemstones"
              }
            >
              {a.text}
            </a>
          )}
        </aside>
      ))}
    </>
  );
}

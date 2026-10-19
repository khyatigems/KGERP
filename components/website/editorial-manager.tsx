"use client";
import { privatePreviewHtml } from "./private-preview";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Images,
  PanelTop,
  Megaphone,
  SearchCheck,
  BarChart3,
  Inbox,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { AnnouncementStudio } from "./announcement-studio";
import { HomepageStudio } from "./homepage-studio";
import { HeroMediaStudio } from "./hero-media-studio";
import { MediaLibraryTable } from "./media-library-table";
const workspaces = [
  {
    name: "Homepage",
    icon: PanelTop,
    description:
      "Arrange sections, preview the page and select featured articles",
  },
  {
    name: "Hero media",
    icon: Images,
    description: "Upload, select and adjust hero images and video",
  },
  {
    name: "Coverage",
    icon: LayoutDashboard,
    description: "Content coverage and publication progress",
  },
  {
    name: "Articles",
    icon: BookOpen,
    description: "Write, review and publish educational content",
  },
  {
    name: "Media & rights",
    icon: Images,
    description: "Cloudinary assets, attribution and usage rights",
  },
  {
    name: "Site information",
    icon: PanelTop,
    description: "Homepage, company details and contact information",
  },
  {
    name: "Announcements",
    icon: Megaphone,
    description: "Scheduled notices with a live website preview",
  },
  {
    name: "Search readiness",
    icon: SearchCheck,
    description: "Publication checks and recorded search evidence",
  },
  {
    name: "Usage counts",
    icon: BarChart3,
    description: "Privacy-conscious website usage totals",
  },
  {
    name: "Enquiries",
    icon: Inbox,
    description: "Customer messages and follow-up work",
  },
];
const fieldLabels: Record<string, string> = {
  heading: "Homepage headline",
  introduction: "Homepage introduction",
  heroPrimaryLabel: "Primary button label",
  heroPrimaryPath: "Primary button path",
  heroSecondaryLabel: "Secondary button label",
  heroSecondaryPath: "Secondary button path",
  companyName: "Company name",
  tagline: "Brand tagline",
  about: "Company story",
  contactEmail: "Contact email",
  phone: "Phone number",
  whatsapp: "WhatsApp number",
  googleVerification: "Google verification code",
  bingVerification: "Bing verification code",
  title: "Media title",
  sourceUrl: "Original source URL",
  publicId: "Cloudinary public ID",
  posterUrl: "Video poster URL",
  permissionEvidence: "Permission evidence",
  verifiedAt: "Verified on",
  creditLine: "Attribution credit",
  creator: "Creator",
  licence: "Licence",
};
import { EnquiryFollowup, type Followup } from "./enquiry-followup";
import {
  articlePath,
  contentSchema,
  imageSchema,
  kinds,
  publicationIssues,
  stages,
  homeSections,
  type Content,
  type ImageAsset,
  type SiteSettings,
} from "@/lib/website/editorial/contract";
import { deliveryUrl } from "@/lib/website/editorial/media";
import type { ArticleRecord } from "@/lib/website/editorial/store";

type Enquiry = Followup & {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  emailStatus?: string;
  emailUpdatedAt?: string;
  emailLogId?: string;
  reference?: string;
};
type Data = {
  articles: ArticleRecord[];
  images: ImageAsset[];
  settings: { payload: SiteSettings; revision: number };
  enquiries: Enquiry[];
  enquiryPagination?: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
    allTotal: number;
    open: number;
    due: number;
    query: string;
    status: string;
    dueOnly: boolean;
  };
  metrics?: { day: string; kind: string; path: string; total: number }[];
  indexing: {
    articleId: string;
    platform: string;
    status: string;
    evidence: string;
    checkedAt: string;
  }[];
};
const field = "w-full rounded border bg-background p-2 text-sm";
const button = "rounded border px-4 py-2 text-sm disabled:opacity-50";
const primary = button + " bg-primary text-primary-foreground";
function Input({
  label,
  value,
  onChange,
  area = false,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm" data-field={label}>
      <span>{fieldLabels[label] || label}</span>
      {area ? (
        <textarea
          className={field}
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
        />
      ) : (
        <input
          className={field}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
        />
      )}
    </label>
  );
}
function Thumbnail({ asset }: { asset: ImageAsset }) {
  const url = asset.mediaType === "video" ? asset.posterUrl : asset.url;
  return url ? (
    <img
      className="h-28 w-full object-contain"
      src={deliveryUrl(url, 320)}
      alt={asset.alt || asset.title}
      loading="lazy"
    />
  ) : (
    <span className="flex h-28 items-center justify-center bg-muted text-sm">
      No media yet
    </span>
  );
}
const localDate = (value: string) =>
  value
    ? new Date(Date.parse(value) - new Date(value).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
const isoDate = (value: string) => (value ? new Date(value).toISOString() : "");

export function EditorialManager() {
  const [data, setData] = useState<Data | null>(null),
    [tab, setTab] = useState("Coverage"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ArticleRecord | null>(null),
    [draft, setDraft] = useState<Content>(() =>
      contentSchema.parse({
        kind: "gemstones",
        title: "New gemstone",
        slug: "new-gemstone",
      }),
    );
  const [media, setMedia] = useState<ImageAsset | null>(null),
    [site, setSite] = useState<SiteSettings | null>(null),
    [preview, setPreview] = useState(false);
  const [homePreview, setHomePreview] = useState("");
  const [articlePreviewHtml, setArticlePreviewHtml] = useState("");
  const [deleteEnquiryId, setDeleteEnquiryId] = useState("");
  const [enquirySearch, setEnquirySearch] = useState("");
  const [siteRevision, setSiteRevision] = useState<number | null>(null);
  const [kindFilter, setKindFilter] = useState("all"),
    [stageFilter, setStageFilter] = useState("all");
  const [enquiryFilter, setEnquiryFilter] = useState({
    query: "",
    status: "all",
    due: false,
    page: 0,
  });
  const [releaseConfirmed, setReleaseConfirmed] = useState(false);
  const [cloudAssets, setCloudAssets] = useState<
      {
        publicId: string;
        folder: string;
        thumbnail: string;
        mediaType: string;
      }[]
    >([]),
    [cloudCursor, setCloudCursor] = useState(""),
    [cloudType, setCloudType] = useState("image");
  const [mediaQuery, setMediaQuery] = useState(""),
    [mediaFilter, setMediaFilter] = useState("all");
  const [reviewer, setReviewer] = useState(""),
    [credentials, setCredentials] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [history, setHistory] = useState<
      { revision: number; stage: string; action: string; createdAt: string }[]
    >([]);
  const [indexNote, setIndexNote] = useState({
    articleId: "",
    platform: "Google",
    status: "Unknown",
    evidence: "",
    checkedAt: "",
    confirmed: false,
  });
  const siteDirty =
    !!site &&
    !!data &&
    JSON.stringify(site) !== JSON.stringify(data.settings.payload);
  useEffect(() => {
    if (!siteDirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [siteDirty]);
  async function load(filter = enquiryFilter) {
    const params = new URLSearchParams({
      enquiryQuery: filter.query,
      enquiryStatus: filter.status,
      enquiryDue: String(filter.due),
      enquiryPage: String(filter.page),
    });
    const response = await fetch("/api/website/editorial?" + params, {
      cache: "no-store",
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
    setData(value);
    return value as Data;
  }
  useEffect(() => {
    let active = true;
    fetch("/api/website/editorial", { cache: "no-store" })
      .then(async (r) => {
        const v = await r.json();
        if (!r.ok) throw new Error(v.error);
        if (active) {
          setData(v);
          setSite(v.settings.payload);
          setSiteRevision(v.settings.revision);
        }
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function write(payload: unknown) {
    const response = await fetch("/api/website/editorial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
    return value;
  }
  async function operation(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function saveSite() {
    if (!data || !site) return;
    await write({
      type: "settings",
      revision: siteRevision ?? data.settings.revision,
      payload: site,
    });
    const next = await load();
    setSite(next.settings.payload);
    setSiteRevision(next.settings.revision);
    setMessage("Website information saved.");
  }
  async function filterEnquiries(patch: Partial<typeof enquiryFilter>) {
    const next = { ...enquiryFilter, ...patch };
    await load(next);
    setEnquiryFilter(next);
  }
  function choose(row: ArticleRecord | null) {
    setSelected(row);
    setDraft(
      row?.payload ||
        contentSchema.parse({
          kind: "gemstones",
          title: "New gemstone",
          slug: "new-gemstone",
        }),
    );
    setPreview(false);
    setHistory([]);
    setConfirmed(false);
    setTab("Articles");
  }
  const set = <K extends keyof Content>(key: K, value: Content[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  async function save() {
    const result = await write({
      type: "article",
      id: selected?.id,
      revision: selected?.revision,
      payload: draft,
    });
    const next = await load();
    choose(next.articles.find((a) => a.id === result.id) || null);
    setMessage("Draft saved. Existing published content remains unchanged.");
  }
  async function advance(
    action: "advance" | "unpublish" | "restore",
    restoreRevision?: number,
  ) {
    if (!selected) return;
    await write({
      type: "transition",
      id: selected.id,
      revision: selected.revision,
      action,
      reviewerName: reviewer,
      credentials,
      confirmed,
      restoreRevision,
    });
    const next = await load();
    choose(next.articles.find((a) => a.id === selected.id) || null);
    setMessage(
      action === "unpublish"
        ? "Publication withdrawn."
        : action === "restore"
          ? "Revision restored as a draft for review."
          : "Editorial stage updated.",
    );
  }
  async function upload(
    file: File,
    purpose: "reference" | "brand" = "reference",
  ) {
    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    if (
      !(
        mediaType === "video"
          ? ["video/mp4", "video/webm", "video/quicktime"]
          : ["image/jpeg", "image/png", "image/webp"]
      ).includes(file.type)
    )
      throw new Error("Use JPG, PNG, WebP, MP4, WebM or MOV.");
    if (file.size > (mediaType === "video" ? 100 : 10) * 1024 * 1024)
      throw new Error("Images: maximum 10 MB. Videos: maximum 100 MB.");
    const sign = await fetch("/api/website/editorial/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sign", mediaType, size: file.size }),
    });
    const grant = await sign.json();
    if (!sign.ok) throw new Error(grant.error);
    const form = new FormData();
    form.set("file", file);
    for (const [key, value] of Object.entries(grant.fields))
      form.set(key, String(value));
    setMessage("Uploading to Cloudinary…");
    const sent = await fetch(grant.endpoint, { method: "POST", body: form });
    if (!sent.ok)
      throw new Error(
        "Cloudinary rejected the file. Check its format, size and account limits.",
      );
    const verified = await fetch("/api/website/editorial/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", grantId: grant.grantId }),
    });
    const result = await verified.json();
    if (!verified.ok) throw new Error(result.error);
    let next = await load();
    let asset = next.images.find((i) => i.id === result.id);
    if (asset && purpose === "brand") {
      const { id, revision, ...payload } = asset;
      await write({
        type: "image",
        id,
        revision,
        payload: { ...payload, purpose: "brand", status: "pending" },
      });
      next = await load();
      asset = next.images.find((i) => i.id === result.id);
    }
    setMedia(asset || null);
    setMessage(
      "Upload saved. Complete its description and rights before approval.",
    );
    return asset;
  }
  const dirty =
    !!selected && JSON.stringify(draft) !== JSON.stringify(selected.payload);
  const filtered =
    data?.articles.filter(
      (a) =>
        (tab !== "Coverage" ||
          ((kindFilter === "all" || a.kind === kindFilter) &&
            (stageFilter === "all" || a.stage === stageFilter))) &&
        `${a.payload.title} ${a.payload.aliases.join(" ")} ${a.kind} ${a.stage}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];
  const issues = publicationIssues(draft, data?.images || []);
  return (
    <div className="website-studio">
      <header className="studio-header">
        <div>
          <p className="studio-eyebrow">KHYATIGEMS / WEBSITE STUDIO</p>
          <h1>Website Management</h1>
          <p>Your publishing workspace for the gemstone encyclopedia.</p>
        </div>
        <a
          className="studio-site-link"
          href="https://www.khyatigems.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          View live website <ArrowUpRight size={16} />
        </a>
      </header>
      <div className="studio-shell">
        <nav className="studio-sidebar" aria-label="Website management">
          <p className="studio-nav-label">WORKSPACE</p>
          {workspaces.map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-label={name}
              type="button"
              disabled={busy}
              aria-pressed={tab === name}
              onClick={() => setTab(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Enquiries" && !!data?.enquiryPagination?.open && (
                <small>{data.enquiryPagination.open}</small>
              )}
            </button>
          ))}
          <div className="studio-sidebar-note">
            <strong>Editorial safeguards</strong>
            <p>
              Only approved public versions leave ERP. Drafts and customer
              messages stay private.
            </p>
          </div>
        </nav>
        <div className="studio-workspace">
          <div className="studio-workspace-heading">
            <div>
              <p className="studio-eyebrow">WEBSITE MANAGEMENT</p>
              <h2>{tab}</h2>
              <p>{workspaces.find((w) => w.name === tab)?.description}</p>
            </div>
            <div className="studio-toolbar">
              {site &&
                data &&
                JSON.stringify(site) !==
                  JSON.stringify(data.settings.payload) && (
                  <>
                    <span className="studio-chip">Unsaved website changes</span>
                    <button
                      onClick={() => {
                        setSite(data.settings.payload);
                        setSiteRevision(data.settings.revision);
                        setMessage("Unsaved website settings discarded.");
                      }}
                    >
                      Discard settings changes
                    </button>
                  </>
                )}
              <button
                disabled={busy}
                onClick={() =>
                  operation(async () => {
                    await load();
                    setMessage(
                      "Workspace refreshed. Unsaved website settings retained.",
                    );
                  })
                }
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
          </div>
          <p
            role="status"
            aria-live="polite"
            className="whitespace-pre-wrap text-sm"
          >
            {message}
          </p>
          {!data ? (
            <div className="space-y-3">
              <p>
                The website content connection is loading. If its schema is not
                ready, initialize the editorial tables below.
              </p>
              <button
                className={primary}
                disabled={busy}
                onClick={() =>
                  operation(async () => {
                    const response = await fetch(
                      "/api/website/editorial/setup",
                      {
                        method: "POST",
                      },
                    );
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error);
                    const next = await load();
                    setSite(next.settings.payload);
                    setSiteRevision(next.settings.revision);
                    setMessage(
                      `Website editor initialized. ${result.imported} research entries imported.`,
                    );
                  })
                }
              >
                Initialize website editor
              </button>
              <p className="text-sm">
                Adds website tables and research entries to the configured
                website database. Existing records are preserved.
              </p>
            </div>
          ) : (
            <fieldset disabled={busy} className="min-w-0 space-y-6">
              {tab === "Announcements" && site && (
                <AnnouncementStudio
                  site={site}
                  change={setSite}
                  save={() => operation(saveSite)}
                  dirty={
                    JSON.stringify(site) !==
                    JSON.stringify(data.settings.payload)
                  }
                />
              )}
              {tab === "Coverage" && (
                <>
                  <div className="studio-quick-actions">
                    {[
                      {
                        title: "Write an article",
                        description: "Create or continue a draft",
                        tab: "Articles",
                        icon: BookOpen,
                      },
                      {
                        title: "Manage media",
                        description: "Uploads and image rights",
                        tab: "Media & rights",
                        icon: Images,
                      },
                      {
                        title: "Design your homepage",
                        description: "Sections, images and preview",
                        tab: "Homepage",
                        icon: PanelTop,
                      },
                      {
                        title: "Review enquiries",
                        description: `${data.enquiryPagination?.open ?? 0} open · ${data.enquiryPagination?.due ?? 0} due`,
                        tab: "Enquiries",
                        icon: Inbox,
                      },
                    ].map(({ title, description, tab, icon: Icon }) => (
                      <button key={title} onClick={() => setTab(tab)}>
                        <Icon size={22} />
                        <strong>{title}</strong>
                        <small>{description}</small>
                        <ArrowUpRight size={15} />
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-4">
                    {[
                      ["Planned entries", data.articles.length],
                      [
                        "Published versions",
                        data.articles.filter((a) => a.publishedAt).length,
                      ],
                      [
                        "Awaiting fact checking",
                        data.articles.filter((a) =>
                          ["research", "draft"].includes(a.stage),
                        ).length,
                      ],
                      [
                        "Media awaiting rights",
                        data.images.filter((i) => i.status !== "approved")
                          .length,
                      ],
                    ].map(([name, count]) => (
                      <div className="rounded border p-4" key={name}>
                        <p className="text-sm">{name}</p>
                        <strong className="text-2xl">{count}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm">
                    Counts describe recorded workflow state, not proof of search
                    indexing. Content is published only after fact, image and
                    SEO checks.
                  </p>
                  <Input
                    label="Find a coverage entry"
                    value={search}
                    onChange={setSearch}
                  />
                  <div className="studio-toolbar">
                    <label className="studio-label">
                      Content type
                      <select
                        value={kindFilter}
                        onChange={(e) => setKindFilter(e.target.value)}
                      >
                        <option value="all">All content types</option>
                        {kinds.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="studio-label">
                      Editorial stage
                      <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                      >
                        <option value="all">All stages</option>
                        {stages.map((k) => (
                          <option key={k} value={k}>
                            {k.replaceAll("-", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="studio-chip">
                      {filtered.length} entries shown
                    </span>
                    <button
                      onClick={() => {
                        setKindFilter("all");
                        setStageFilter("all");
                        setSearch("");
                      }}
                    >
                      Reset content filters
                    </button>
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th className="p-3">Entry</th>
                          <th>Type</th>
                          <th>Stage</th>
                          <th>Outstanding checks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((a) => (
                          <tr className="border-t" key={a.id}>
                            <td className="p-3">
                              <button
                                className="underline"
                                onClick={() => choose(a)}
                              >
                                {a.payload.title}
                              </button>
                            </td>
                            <td>{a.kind}</td>
                            <td>{a.stage}</td>
                            <td className="max-w-sm p-3">
                              {publicationIssues(a.payload, data.images).join(
                                "; ",
                              ) || "Publication checks complete"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {tab === "Articles" && (
                <div className="grid min-w-0 gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
                  <aside className="space-y-3">
                    <button className={primary} onClick={() => choose(null)}>
                      New article
                    </button>
                    <button
                      className={button}
                      onClick={() =>
                        operation(async () => {
                          const result = await write({ type: "import-drafts" });
                          await load();
                          setMessage(
                            "Prepared library drafts imported. Staff edits were preserved; nothing was published.",
                          );
                        })
                      }
                    >
                      Import prepared library drafts
                    </button>
                    <label className="flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={releaseConfirmed}
                        onChange={(event) =>
                          setReleaseConfirmed(event.target.checked)
                        }
                      />
                      Use the owner-authorized AI-assisted review release. Named
                      gemologist review is not claimed; existing publications
                      and edited drafts are preserved.
                    </label>
                    <button
                      className={button}
                      disabled={!releaseConfirmed || busy}
                      onClick={() =>
                        operation(async () => {
                          let offset: number | null = 0,
                            imported = 0,
                            preserved = 0;
                          while (offset !== null) {
                            const result = await write({
                              type: "import-reviewed-release",
                              confirmed: true,
                              offset,
                            });
                            imported += result.imported;
                            preserved += result.preserved.length;
                            offset = result.nextOffset;
                            setMessage(
                              `Importing reviewed release: ${imported} published, ${preserved} preserved.`,
                            );
                          }
                          await load();
                          setMessage(
                            `Reviewed release imported: ${imported} published, ${preserved} existing entries preserved.`,
                          );
                          setReleaseConfirmed(false);
                        })
                      }
                    >
                      Import reviewed launch release
                    </button>
                    <Input
                      label="Find article"
                      value={search}
                      onChange={setSearch}
                    />
                    <div className="max-h-[650px] space-y-2 overflow-auto">
                      {filtered.map((a) => (
                        <button
                          className={button + " w-full text-left"}
                          key={a.id}
                          onClick={() => choose(a)}
                        >
                          <strong>{a.payload.title}</strong>
                          <span className="block text-xs">
                            {a.kind} · {a.stage}
                          </span>
                        </button>
                      ))}
                    </div>
                  </aside>
                  <div className="min-w-0 space-y-5 rounded border p-4">
                    <div className="flex flex-wrap gap-3">
                      <button
                        className={primary}
                        onClick={() => operation(save)}
                      >
                        Save draft
                      </button>
                      <button
                        className={button}
                        onClick={() => setPreview((v) => !v)}
                      >
                        {preview ? "Edit content" : "Preview draft"}
                      </button>
                      <button
                        className={button}
                        onClick={() =>
                          operation(async () => {
                            const response = await fetch(
                              "/api/website/editorial/preview",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  type: "article",
                                  payload: draft,
                                }),
                              },
                            );
                            const value = await response.json();
                            if (!response.ok) throw new Error(value.error);
                            setArticlePreviewHtml(privatePreviewHtml(value));
                          })
                        }
                      >
                        Preview full article page
                      </button>
                      {articlePreviewHtml && (
                        <div className="w-full space-y-2">
                          <iframe
                            title="Private article page preview"
                            sandbox=""
                            srcDoc={articlePreviewHtml}
                            className="h-[800px] w-full border bg-white"
                          />
                          <button
                            className={button}
                            onClick={() => setArticlePreviewHtml("")}
                          >
                            Close article page preview
                          </button>
                        </div>
                      )}
                      {selected && (
                        <button
                          className={button}
                          onClick={() =>
                            operation(async () => {
                              const response = await fetch(
                                "/api/website/editorial?revisions=" +
                                  selected.id,
                              );
                              const value = await response.json();
                              if (!response.ok) throw new Error(value.error);
                              setHistory(value.revisions);
                            })
                          }
                        >
                          Revision history
                        </button>
                      )}
                    </div>
                    {selected && (
                      <p className="text-sm">
                        Stage: <strong>{selected.stage}</strong> · revision{" "}
                        {selected.revision}
                        {selected.publishedRevision
                          ? ` · live revision ${selected.publishedRevision}`
                          : ""}
                        {dirty ? " · unsaved changes" : ""}
                      </p>
                    )}
                    {preview ? (
                      <article className="space-y-5">
                        <p className="rounded bg-muted p-3">
                          Private draft preview — not a public publication.
                        </p>
                        <h2 className="text-3xl font-serif">{draft.title}</h2>
                        <p>{draft.summary}</p>
                        {draft.properties.map((p, i) => (
                          <p key={i}>
                            <strong>{p.name}:</strong> {p.value}
                          </p>
                        ))}
                        {draft.sections.map((s, i) => (
                          <section key={i}>
                            <h3 className="text-xl font-semibold">
                              {s.heading}
                            </h3>
                            <p className="whitespace-pre-line">{s.body}</p>
                          </section>
                        ))}
                        {data.images
                          .filter((i) => draft.imageIds.includes(i.id))
                          .map((i) => (
                            <figure key={i.id}>
                              {i.mediaType === "video" ? (
                                <video
                                  className="max-h-96 max-w-full"
                                  controls
                                  preload="none"
                                  src={i.url}
                                  poster={i.posterUrl}
                                />
                              ) : (
                                <img
                                  className="max-h-96 max-w-full object-contain"
                                  src={i.url}
                                  alt={i.alt}
                                />
                              )}
                              <figcaption>
                                {i.caption} · {i.status}
                              </figcaption>
                            </figure>
                          ))}
                      </article>
                    ) : (
                      <>
                        <label className="block text-sm">
                          Article type
                          <select
                            className={field}
                            value={draft.kind}
                            disabled={!!selected?.publishedAt}
                            onChange={(e) =>
                              set("kind", e.target.value as Content["kind"])
                            }
                          >
                            {kinds.map((k) => (
                              <option key={k}>{k}</option>
                            ))}
                          </select>
                        </label>
                        <Input
                          label="Title"
                          value={draft.title}
                          onChange={(v) => set("title", v)}
                        />
                        <Input
                          label="URL slug"
                          value={draft.slug}
                          readOnly={!!selected?.publishedAt}
                          onChange={(v) =>
                            set(
                              "slug",
                              v
                                .toLowerCase()
                                .replace(/[^a-z0-9-]/g, "-")
                                .replace(/-+/g, "-"),
                            )
                          }
                        />
                        <p className="text-xs">
                          Public path when approved: {articlePath(draft)}
                        </p>
                        <Input
                          label="Introduction"
                          value={draft.summary}
                          area
                          onChange={(v) => set("summary", v)}
                        />
                        <div className="grid gap-4 md:grid-cols-2">
                          {(["family", "material", "parentSlug"] as const).map(
                            (k) => (
                              <Input
                                key={k}
                                label={
                                  k === "parentSlug" ? "Parent entry slug" : k
                                }
                                value={draft[k]}
                                onChange={(v) => set(k, v)}
                              />
                            ),
                          )}
                          <Input
                            label="Alternate / Hindi / traditional names (one per line)"
                            value={draft.aliases.join("\n")}
                            area
                            onChange={(v) => set("aliases", v.split("\n"))}
                          />
                          <Input
                            label="Colours (comma separated)"
                            value={draft.colours.join(",")}
                            onChange={(v) =>
                              set(
                                "colours",
                                v.split(",").map((s) => s.trim()),
                              )
                            }
                          />
                          <Input
                            label="Related entry slugs (comma separated)"
                            value={draft.relatedSlugs.join(",")}
                            onChange={(v) =>
                              set(
                                "relatedSlugs",
                                v.split(",").map((s) => s.trim()),
                              )
                            }
                          />
                        </div>
                        <h2 className="text-lg font-semibold">Properties</h2>
                        {draft.properties.map((p, i) => (
                          <div
                            className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]"
                            key={i}
                          >
                            <Input
                              label="Property"
                              value={p.name}
                              onChange={(v) =>
                                set(
                                  "properties",
                                  draft.properties.map((r, j) =>
                                    j === i ? { ...r, name: v } : r,
                                  ),
                                )
                              }
                            />
                            <Input
                              label="Qualified value / range"
                              value={p.value}
                              onChange={(v) =>
                                set(
                                  "properties",
                                  draft.properties.map((r, j) =>
                                    j === i ? { ...r, value: v } : r,
                                  ),
                                )
                              }
                            />
                            <button
                              className={button}
                              onClick={() =>
                                set(
                                  "properties",
                                  draft.properties.filter((_, j) => j !== i),
                                )
                              }
                            >
                              Remove property
                            </button>
                          </div>
                        ))}
                        <button
                          className={button}
                          onClick={() =>
                            set("properties", [
                              ...draft.properties,
                              { name: "", value: "" },
                            ])
                          }
                        >
                          Add property
                        </button>
                        <h2 className="text-lg font-semibold">
                          Article sections
                        </h2>
                        {draft.sections.map((s, i) => (
                          <div className="space-y-3 rounded border p-3" key={i}>
                            <Input
                              label="Section heading"
                              value={s.heading}
                              onChange={(v) =>
                                set(
                                  "sections",
                                  draft.sections.map((r, j) =>
                                    j === i ? { ...r, heading: v } : r,
                                  ),
                                )
                              }
                            />
                            <Input
                              label="Section text — separate paragraphs with a blank line"
                              value={s.body}
                              area
                              onChange={(v) =>
                                set(
                                  "sections",
                                  draft.sections.map((r, j) =>
                                    j === i ? { ...r, body: v } : r,
                                  ),
                                )
                              }
                            />
                            <button
                              className={button}
                              onClick={() =>
                                set(
                                  "sections",
                                  draft.sections.filter((_, j) => j !== i),
                                )
                              }
                            >
                              Remove section
                            </button>
                          </div>
                        ))}
                        <button
                          className={button}
                          onClick={() =>
                            set("sections", [
                              ...draft.sections,
                              { heading: "", body: "" },
                            ])
                          }
                        >
                          Add section
                        </button>
                        <h2 className="text-lg font-semibold">
                          Questions for the knowledge assistant
                        </h2>
                        <p className="text-sm">
                          Published answers are quoted with a source link. Only
                          write evidence-supported answers.
                        </p>
                        {draft.faqs.map((f, i) => (
                          <div key={i} className="space-y-3 rounded border p-3">
                            <Input
                              label="Question"
                              value={f.question}
                              onChange={(v) =>
                                set(
                                  "faqs",
                                  draft.faqs.map((r, j) =>
                                    j === i ? { ...r, question: v } : r,
                                  ),
                                )
                              }
                            />
                            <Input
                              label="Answer"
                              value={f.answer}
                              area
                              onChange={(v) =>
                                set(
                                  "faqs",
                                  draft.faqs.map((r, j) =>
                                    j === i ? { ...r, answer: v } : r,
                                  ),
                                )
                              }
                            />
                            <button
                              className={button}
                              onClick={() =>
                                set(
                                  "faqs",
                                  draft.faqs.filter((_, j) => j !== i),
                                )
                              }
                            >
                              Remove question
                            </button>
                          </div>
                        ))}
                        <button
                          className={button}
                          onClick={() =>
                            set("faqs", [
                              ...draft.faqs,
                              { question: "", answer: "" },
                            ])
                          }
                        >
                          Add question
                        </button>
                        <h2 className="text-lg font-semibold">Sources</h2>
                        {draft.sources.map((s, i) => (
                          <div className="space-y-2 rounded border p-3" key={i}>
                            {(["title", "url", "checkedAt"] as const).map(
                              (k) => (
                                <Input
                                  key={k}
                                  label={k === "checkedAt" ? "Date checked" : k}
                                  type={
                                    k === "checkedAt"
                                      ? "date"
                                      : k === "url"
                                        ? "url"
                                        : "text"
                                  }
                                  value={s[k]}
                                  onChange={(v) =>
                                    set(
                                      "sources",
                                      draft.sources.map((r, j) =>
                                        j === i ? { ...r, [k]: v } : r,
                                      ),
                                    )
                                  }
                                />
                              ),
                            )}
                            <button
                              className={button}
                              onClick={() =>
                                set(
                                  "sources",
                                  draft.sources.filter((_, j) => j !== i),
                                )
                              }
                            >
                              Remove source
                            </button>
                          </div>
                        ))}
                        <button
                          className={button}
                          onClick={() =>
                            set("sources", [
                              ...draft.sources,
                              { title: "", url: "", checkedAt: "" },
                            ])
                          }
                        >
                          Add source
                        </button>
                        <h2 className="text-lg font-semibold">Article media</h2>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                          {data.images.map((i) => (
                            <label className="rounded border p-2" key={i.id}>
                              <Thumbnail asset={i} />
                              <input
                                type="checkbox"
                                checked={draft.imageIds.includes(i.id)}
                                onChange={(e) =>
                                  set(
                                    "imageIds",
                                    e.target.checked
                                      ? [...draft.imageIds, i.id]
                                      : draft.imageIds.filter(
                                          (id) => id !== i.id,
                                        ),
                                  )
                                }
                              />{" "}
                              {i.title}
                              <small className="block">
                                {i.mediaType} · {i.status}
                              </small>
                            </label>
                          ))}
                        </div>
                        {!data.images.length && (
                          <p className="text-sm">
                            Upload files in Media &amp; rights first.
                          </p>
                        )}
                        <Input
                          label="SEO title"
                          value={draft.seoTitle}
                          onChange={(v) => set("seoTitle", v)}
                        />
                        <Input
                          label="Meta description"
                          value={draft.metaDescription}
                          area
                          onChange={(v) => set("metaDescription", v)}
                        />
                        <Input
                          label="Publish no earlier than (your local time; stored as UTC)"
                          type="datetime-local"
                          value={localDate(draft.publishAt)}
                          onChange={(v) => set("publishAt", isoDate(v))}
                        />
                      </>
                    )}
                    {selected && (
                      <div className="space-y-3 border-t pt-5">
                        <h2 className="text-lg font-semibold">
                          Editorial approval
                        </h2>
                        {issues.length > 0 && (
                          <ul className="list-disc space-y-1 pl-5 text-sm">
                            {issues.map((issue) => (
                              <li key={issue}>{issue}</li>
                            ))}
                          </ul>
                        )}
                        {selected.stage === "draft" && (
                          <>
                            <Input
                              label="Genuine reviewer name"
                              value={reviewer}
                              onChange={setReviewer}
                            />
                            <Input
                              label="Reviewer role / qualifications"
                              value={credentials}
                              onChange={setCredentials}
                            />
                            <label className="flex items-start gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                              />{" "}
                              I confirm this content has been checked against
                              its sources by the named reviewer.
                            </label>
                          </>
                        )}
                        <div className="flex flex-wrap gap-3">
                          {selected.stage !== "published" && (
                            <button
                              disabled={dirty}
                              className={primary}
                              onClick={() =>
                                operation(() => advance("advance"))
                              }
                            >
                              Move to{" "}
                              {stages[stages.indexOf(selected.stage) + 1]}
                            </button>
                          )}
                          {selected.publishedAt && (
                            <button
                              className={button}
                              onClick={() =>
                                operation(() => advance("unpublish"))
                              }
                            >
                              Unpublish
                            </button>
                          )}
                        </div>
                        {dirty && (
                          <p className="text-sm">
                            Save the draft before changing its review stage.
                          </p>
                        )}
                      </div>
                    )}
                    {history.length > 0 && (
                      <section>
                        <h2 className="text-lg font-semibold">
                          Revision history
                        </h2>
                        {history.map((r) => (
                          <div
                            className="flex flex-wrap justify-between gap-3 border-b py-3"
                            key={r.revision}
                          >
                            <span>
                              Revision {r.revision} · {r.action} · {r.stage} ·{" "}
                              {new Date(r.createdAt).toLocaleString()}
                            </span>
                            <button
                              className={button}
                              onClick={() =>
                                operation(() => advance("restore", r.revision))
                              }
                            >
                              Restore as draft
                            </button>
                          </div>
                        ))}
                      </section>
                    )}
                  </div>
                </div>
              )}
              {tab === "Media & rights" && (
                <>
                  <div className="rounded border p-4">
                    <h2 className="text-xl font-semibold">
                      Cloudinary website library
                    </h2>
                    <p className="text-sm">
                      Existing Cloudinary assets can be added as pending
                      references. Their presence in storage does not establish
                      ownership, material identity or website permission.
                    </p>
                    <label className="block text-sm">
                      Existing asset type
                      <select
                        className={field}
                        value={cloudType}
                        onChange={(event) => {
                          setCloudType(event.target.value);
                          setCloudAssets([]);
                          setCloudCursor("");
                        }}
                      >
                        <option value="image">Images</option>
                        <option value="video">Videos</option>
                      </select>
                    </label>
                    <button
                      className={button}
                      onClick={() =>
                        operation(async () => {
                          const response = await fetch(
                            "/api/website/editorial/cloudinary?type=" +
                              cloudType,
                          );
                          const value = await response.json();
                          if (!response.ok) throw new Error(value.error);
                          setCloudAssets(value.assets);
                          setCloudCursor(value.cursor);
                        })
                      }
                    >
                      Browse existing Cloudinary assets
                    </button>
                    {cloudAssets.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {cloudAssets
                          .filter((asset) =>
                            `${asset.publicId} ${asset.folder}`
                              .toLowerCase()
                              .includes(mediaQuery.toLowerCase()),
                          )
                          .map((asset) => (
                            <div
                              className="space-y-2 rounded border p-2"
                              key={asset.publicId}
                            >
                              <img
                                src={asset.thumbnail}
                                alt="Candidate awaiting specimen confirmation"
                                className="h-24 w-full object-contain"
                                loading="lazy"
                              />
                              <p className="break-all text-xs">
                                Folder: {asset.folder || "(root)"}
                                <br />
                                Public ID: {asset.publicId}
                              </p>
                              <button
                                className={button}
                                onClick={() =>
                                  operation(async () => {
                                    const response = await fetch(
                                      "/api/website/editorial/cloudinary",
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          publicId: asset.publicId,
                                          mediaType: asset.mediaType,
                                        }),
                                      },
                                    );
                                    const value = await response.json();
                                    if (!response.ok)
                                      throw new Error(value.error);
                                    const next = await load();
                                    setMedia(
                                      next.images.find(
                                        (item) => item.id === value.id,
                                      ) || null,
                                    );
                                    setMessage(
                                      "Existing asset added as pending. Complete permission and specimen review before approval.",
                                    );
                                  })
                                }
                              >
                                Add for rights review
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                    {cloudCursor && (
                      <button
                        className={button}
                        onClick={() =>
                          operation(async () => {
                            const response = await fetch(
                              "/api/website/editorial/cloudinary?type=" +
                                cloudType +
                                "&cursor=" +
                                encodeURIComponent(cloudCursor),
                            );
                            const value = await response.json();
                            if (!response.ok) throw new Error(value.error);
                            setCloudAssets([...cloudAssets, ...value.assets]);
                            setCloudCursor(value.cursor);
                          })
                        }
                      >
                        Load more Cloudinary assets
                      </button>
                    )}
                    <p className="my-3 text-sm">
                      Uses the ERP’s Cloudinary connection. JPG/PNG/WebP up to
                      10 MB; MP4/WebM/MOV up to 100 MB. Files are stored under
                      website/editorial, separate from inventory media.
                    </p>
                    <label className="block">
                      Upload an image or video
                      <input
                        className={field}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            void operation(async () => {
                              await upload(file);
                            });
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      className={button + " mt-3"}
                      onClick={() =>
                        setMedia({
                          ...imageSchema.parse({
                            title: "New media reference",
                          }),
                          id: "",
                          revision: 0,
                        })
                      }
                    >
                      Add an existing licensed media URL
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Input
                      label="Search media by title, specimen or public ID"
                      value={mediaQuery}
                      onChange={setMediaQuery}
                    />
                    <label className="text-sm">
                      Media filter
                      <select
                        className={field}
                        value={mediaFilter}
                        onChange={(event) => setMediaFilter(event.target.value)}
                      >
                        {[
                          "all",
                          "image",
                          "video",
                          "pending",
                          "approved",
                          "archived",
                        ].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <MediaLibraryTable
                    images={data.images.filter(
                      (item) =>
                        (mediaFilter === "archived"
                          ? item.status === "archived"
                          : item.status !== "archived") &&
                        (mediaFilter === "all" ||
                          item.mediaType === mediaFilter ||
                          item.status === mediaFilter) &&
                        `${item.title} ${item.specimen} ${item.cloudinaryPublicId}`
                          .toLowerCase()
                          .includes(mediaQuery.toLowerCase()),
                    )}
                    select={setMedia}
                    archive={(asset, restore) =>
                      operation(async () => {
                        const { id, revision, ...payload } = asset;
                        await write({
                          type: "image",
                          id,
                          revision,
                          payload: {
                            ...payload,
                            status: restore ? "pending" : "archived",
                          },
                        });
                        await load();
                        if (media?.id === id) setMedia(null);
                        setMessage(
                          restore
                            ? "Media restored as pending."
                            : "Media archived. The Cloudinary original is preserved.",
                        );
                      })
                    }
                  />
                  {media && (
                    <div className="space-y-4 rounded border p-4">
                      <h2 className="text-xl font-semibold">
                        Media details &amp; permissions
                      </h2>
                      <p className="text-sm">
                        Used by:{" "}
                        {data.articles
                          .filter((article) =>
                            article.payload.imageIds.includes(media.id),
                          )
                          .map((article) => article.payload.title)
                          .join(", ") || "No draft articles"}
                        {[
                          data.settings.payload.heroImageId,
                          data.settings.payload.heroVideoId,
                          data.settings.payload.brandImageId,
                          ...data.settings.payload.galleryImageIds,
                        ].includes(media.id)
                          ? " · Homepage or gallery"
                          : ""}
                        . Revoking approval removes this asset from public page
                        placements.
                      </p>
                      {media.mediaType === "video" ? (
                        <video
                          className="max-h-80 max-w-full"
                          controls
                          preload="none"
                          poster={media.posterUrl}
                          src={media.url}
                        />
                      ) : (
                        <Thumbnail asset={media} />
                      )}
                      <label className="block text-sm">
                        Media type
                        <select
                          className={field}
                          value={media.mediaType}
                          disabled={!!media.cloudinaryPublicId}
                          onChange={(e) =>
                            setMedia({
                              ...media,
                              mediaType: e.target.value as "image" | "video",
                            })
                          }
                        >
                          <option>image</option>
                          <option>video</option>
                        </select>
                      </label>
                      <div className="grid gap-4 md:grid-cols-2">
                        {(
                          [
                            "title",
                            "url",
                            "posterUrl",
                            "alt",
                            "caption",
                            "specimen",
                            "creator",
                            "sourceUrl",
                            "license",
                            "licenseUrl",
                            "attribution",
                            "modifications",
                            "permissionEvidence",
                            "verifiedAt",
                            "transcript",
                            "captionsVtt",
                          ] as const
                        ).map((k) => (
                          <Input
                            key={k}
                            label={
                              (
                                {
                                  url: "Media URL",
                                  posterUrl: "Video poster / thumbnail URL",
                                  alt: "Accessible description",
                                  permissionEvidence:
                                    "Internal permission evidence (not published)",
                                  verifiedAt: "Rights checked on",
                                } as Record<string, string>
                              )[k] || k
                            }
                            type={k === "verifiedAt" ? "date" : "text"}
                            area={[
                              "caption",
                              "transcript",
                              "captionsVtt",
                              "permissionEvidence",
                            ].includes(k)}
                            value={media[k]}
                            onChange={(v) =>
                              setMedia({ ...media, [k]: v, status: "pending" })
                            }
                          />
                        ))}
                      </div>
                      <label className="studio-label">
                        Media purpose
                        <select
                          value={media.purpose}
                          onChange={(e) =>
                            setMedia({
                              ...media,
                              purpose: e.target.value as "reference" | "brand",
                              status: "pending",
                            })
                          }
                        >
                          <option value="reference">
                            Specimen reference photograph
                          </option>
                          <option value="brand">
                            Brand / hero media or illustration
                          </option>
                        </select>
                        <small className="studio-help">
                          Brand artwork cannot satisfy a gemstone article's
                          specimen photography requirement.
                        </small>
                      </label>
                      <label className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={media.commercialUse}
                          onChange={(e) =>
                            setMedia({
                              ...media,
                              commercialUse: e.target.checked,
                              status: "pending",
                            })
                          }
                        />{" "}
                        Rights allow commercial website use
                      </label>
                      <label className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={media.authenticPhoto}
                          onChange={(e) =>
                            setMedia({
                              ...media,
                              authenticPhoto: e.target.checked,
                              status: "pending",
                            })
                          }
                        />{" "}
                        {media.purpose === "brand"
                          ? "This is a genuine photograph (optional for brand artwork)"
                          : "Genuine photographic media accurately depicting the stated subject"}
                      </label>
                      <label className="block text-sm">
                        Rights status
                        <select
                          className={field}
                          value={media.status}
                          onChange={(e) =>
                            setMedia({
                              ...media,
                              status: e.target.value as "pending" | "approved",
                            })
                          }
                        >
                          <option>pending</option>
                          <option>approved</option>
                        </select>
                      </label>
                      <button
                        className={primary}
                        onClick={() =>
                          operation(async () => {
                            const { id, revision, ...payload } = media;
                            const saved = await write({
                              type: "image",
                              id: id || undefined,
                              revision: revision || undefined,
                              payload,
                            });
                            const next = await load();
                            setMedia(null);
                            setMessage("Media details and rights saved.");
                          })
                        }
                      >
                        Save media details
                      </button>
                    </div>
                  )}
                </>
              )}
              {tab === "Homepage" && site && (
                <HomepageStudio
                  site={site}
                  images={data.images}
                  articles={data.articles}
                  change={setSite}
                  save={() => operation(saveSite)}
                  openHero={() => setTab("Hero media")}
                />
              )}
              {tab === "Hero media" && site && (
                <HeroMediaStudio
                  site={site}
                  images={data.images}
                  change={setSite}
                  save={() => operation(saveSite)}
                  upload={async (file) => {
                    setBusy(true);
                    try {
                      return await upload(file, "brand");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  review={(asset) => {
                    setMedia(asset);
                    setTab("Media & rights");
                  }}
                />
              )}
              {tab === "Site information" && site && (
                <div className="space-y-5">
                  <div className="studio-section-heading">
                    <div>
                      <h2>Company and contact information</h2>
                      <p>
                        Manage public company details, gallery placements and
                        optional storefront links.
                      </p>
                    </div>
                    <button
                      className={primary}
                      onClick={() => operation(saveSite)}
                    >
                      Save website information
                    </button>
                  </div>
                  <div className="studio-panel space-y-4">
                    <h3>Company details</h3>
                    <div className="studio-form-grid">
                      {(
                        [
                          "companyName",
                          "tagline",
                          "about",
                          "contactEmail",
                          "phone",
                          "whatsapp",
                        ] as const
                      ).map((k) => (
                        <Input
                          key={k}
                          label={k}
                          value={site[k]}
                          area={k === "about"}
                          onChange={(v) => setSite({ ...site, [k]: v })}
                        />
                      ))}
                    </div>
                    <label className="studio-switch">
                      <input
                        type="checkbox"
                        checked={site.contactVerified}
                        onChange={(e) =>
                          setSite({
                            ...site,
                            contactVerified: e.target.checked,
                          })
                        }
                      />
                      Company contact details checked for public use
                    </label>
                  </div>
                  <div className="studio-panel space-y-4">
                    <h3>Company image and gallery</h3>
                    <label className="studio-label">
                      Company photograph
                      <select
                        value={site.brandImageId}
                        onChange={(e) =>
                          setSite({ ...site, brandImageId: e.target.value })
                        }
                      >
                        <option value="">
                          Use existing brand presentation
                        </option>
                        {data.images
                          .filter(
                            (i) =>
                              i.mediaType === "image" &&
                              i.status !== "archived",
                          )
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.title} · {i.status}
                            </option>
                          ))}
                      </select>
                    </label>
                    <p className="studio-help">
                      Selected gallery images appear only after rights approval.
                    </p>
                    <div className="studio-feature-picks">
                      {data.images
                        .filter(
                          (i) =>
                            i.mediaType === "image" && i.status !== "archived",
                        )
                        .map((i) => (
                          <label key={i.id}>
                            <input
                              type="checkbox"
                              checked={site.galleryImageIds.includes(i.id)}
                              onChange={(e) =>
                                setSite({
                                  ...site,
                                  galleryImageIds: e.target.checked
                                    ? [...site.galleryImageIds, i.id].slice(
                                        0,
                                        30,
                                      )
                                    : site.galleryImageIds.filter(
                                        (id) => id !== i.id,
                                      ),
                                })
                              }
                            />
                            <img
                              src={i.url}
                              alt=""
                              width={60}
                              height={45}
                              loading="lazy"
                            />
                            <span>
                              {i.title}
                              <small>{i.status}</small>
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                  <div className="studio-panel space-y-4">
                    <h3>Optional verified storefront links</h3>
                    <p className="studio-help">
                      Marketplace logos can remain unlinked, as requested. Add
                      URLs only when you want visitors to use verified seller
                      destinations.
                    </p>
                    {site.marketplaces.map((store, index) => (
                      <div className="studio-form-grid" key={index}>
                        {(["name", "url", "verifiedAt"] as const).map((key) => (
                          <Input
                            key={key}
                            label={
                              key === "name"
                                ? "Marketplace name"
                                : key === "url"
                                  ? "Verified shop URL"
                                  : "Verified on"
                            }
                            type={key === "verifiedAt" ? "date" : "text"}
                            value={store[key]}
                            onChange={(value) =>
                              setSite({
                                ...site,
                                marketplaces: site.marketplaces.map((row, i) =>
                                  i === index ? { ...row, [key]: value } : row,
                                ),
                              })
                            }
                          />
                        ))}
                        <button
                          onClick={() =>
                            setSite({
                              ...site,
                              marketplaces: site.marketplaces.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                        >
                          Remove storefront
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setSite({
                          ...site,
                          marketplaces: [
                            ...site.marketplaces,
                            { name: "", url: "", verifiedAt: "" },
                          ],
                        })
                      }
                      disabled={site.marketplaces.length >= 12}
                    >
                      Add storefront
                    </button>
                  </div>
                  <div className="studio-panel">
                    <h3>Homepage design</h3>
                    <p>
                      Homepage layout, featured articles and hero media now have
                      dedicated workspaces.
                    </p>
                    <button onClick={() => setTab("Homepage")}>
                      Open homepage designer
                    </button>
                  </div>
                </div>
              )}
              {tab === "Search readiness" && (
                <section className="space-y-5 rounded border p-4">
                  {site && (
                    <details className="studio-panel">
                      <summary>
                        Advanced: Google and Bing ownership verification
                        (optional)
                      </summary>
                      <p className="studio-help">
                        These codes prove you control the domain when connecting
                        Search Console or Bing Webmaster Tools. They do not
                        power the website search or guarantee indexing. Leave
                        them unchanged if the domain is already verified.
                      </p>
                      <Input
                        label="googleVerification"
                        value={site.googleVerification}
                        onChange={(v) =>
                          setSite({ ...site, googleVerification: v })
                        }
                      />
                      <Input
                        label="bingVerification"
                        value={site.bingVerification}
                        onChange={(v) =>
                          setSite({ ...site, bingVerification: v })
                        }
                      />
                      <button onClick={() => operation(saveSite)}>
                        Save verification codes
                      </button>
                    </details>
                  )}
                  <h2 className="text-xl font-semibold">
                    Search indexing register
                  </h2>
                  <p className="text-sm">
                    Sitemap inclusion is not evidence of indexing. Record
                    observations from{" "}
                    <a
                      className="underline"
                      href="https://search.google.com/search-console"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Google Search Console
                    </a>{" "}
                    or{" "}
                    <a
                      className="underline"
                      href="https://www.bing.com/webmasters"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Bing Webmaster Tools
                    </a>
                    .
                  </p>
                  <label className="block text-sm">
                    Published article
                    <select
                      className={field}
                      value={indexNote.articleId}
                      onChange={(e) =>
                        setIndexNote({
                          ...indexNote,
                          articleId: e.target.value,
                        })
                      }
                    >
                      <option value="">Choose an article</option>
                      {data.articles
                        .filter((a) => a.publishedAt)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.payload.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      Search platform
                      <select
                        className={field}
                        value={indexNote.platform}
                        onChange={(e) =>
                          setIndexNote({
                            ...indexNote,
                            platform: e.target.value,
                          })
                        }
                      >
                        <option>Google</option>
                        <option>Bing</option>
                      </select>
                    </label>
                    <label className="block text-sm">
                      Observed status
                      <select
                        className={field}
                        value={indexNote.status}
                        onChange={(e) =>
                          setIndexNote({ ...indexNote, status: e.target.value })
                        }
                      >
                        {["Unknown", "Submitted", "Indexed", "Excluded"].map(
                          (s) => (
                            <option key={s}>{s}</option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  <Input
                    label="Date checked"
                    type="date"
                    value={indexNote.checkedAt}
                    onChange={(v) =>
                      setIndexNote({ ...indexNote, checkedAt: v })
                    }
                  />
                  <Input
                    label="Platform evidence / report reference"
                    area
                    value={indexNote.evidence}
                    onChange={(v) =>
                      setIndexNote({ ...indexNote, evidence: v })
                    }
                  />
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={indexNote.confirmed}
                      onChange={(e) =>
                        setIndexNote({
                          ...indexNote,
                          confirmed: e.target.checked,
                        })
                      }
                    />{" "}
                    I checked this status in the selected search platform.
                  </label>
                  <button
                    className={primary}
                    onClick={() =>
                      operation(async () => {
                        await write({ type: "indexing", payload: indexNote });
                        await load();
                        setMessage("Search observation saved.");
                      })
                    }
                  >
                    Save search observation
                  </button>
                  <div className="overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th className="p-3">Article</th>
                          <th>Platform</th>
                          <th>Status</th>
                          <th>Checked</th>
                          <th>Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.indexing.map((r) => (
                          <tr
                            className="border-t"
                            key={r.articleId + r.platform}
                          >
                            <td className="p-3">
                              {data.articles.find((a) => a.id === r.articleId)
                                ?.payload.title || r.articleId}
                            </td>
                            <td>{r.platform}</td>
                            <td>{r.status}</td>
                            <td>{r.checkedAt}</td>
                            <td className="max-w-md whitespace-pre-wrap p-3">
                              {r.evidence}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!data.indexing.length && (
                    <p>No indexing evidence has been recorded.</p>
                  )}
                  <h3 className="text-lg font-semibold">
                    Content review checks
                  </h3>
                  <p className="text-sm">
                    {
                      data.articles.filter((a) =>
                        a.payload.sources.some(
                          (s) =>
                            Date.parse(s.checkedAt) <
                            Date.now() - 365 * 86400000,
                        ),
                      ).length
                    }{" "}
                    entries have source checks older than one year.{" "}
                    {
                      data.articles.filter(
                        (a) =>
                          a.kind === "gemstones" &&
                          !a.payload.relatedSlugs.length,
                      ).length
                    }{" "}
                    gemstone drafts have no related-entry links. Source
                    reachability and external search performance require
                    platform checks.
                  </p>
                </section>
              )}
              {tab === "Usage counts" && (
                <section className="space-y-4">
                  <h2 className="text-xl font-semibold">
                    Anonymous usage counts — last 30 days
                  </h2>
                  <p className="text-sm">
                    Opted-in page views, verified storefront clicks and
                    client-confirmed enquiry submissions. These are event
                    counts, not unique visitors or search traffic. Personal
                    details and query text are not recorded in this table.
                  </p>
                  <div className="studio-quick-actions">
                    {[
                      ["view", "Page views"],
                      ["marketplace", "Verified storefront clicks"],
                      ["enquiry", "Saved enquiry events"],
                    ].map(([kind, label]) => (
                      <div className="studio-panel" key={kind}>
                        <p className="studio-help">{label}</p>
                        <strong className="text-2xl">
                          {(data.metrics || [])
                            .filter((m) => m.kind === kind)
                            .reduce((n, m) => n + Number(m.total), 0)}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      operation(async () => {
                        await load();
                        setMessage("Usage counts refreshed.");
                      })
                    }
                  >
                    Refresh usage counts
                  </button>
                  <div className="overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Action</th>
                          <th>Path</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.metrics || []).map((item) => (
                          <tr
                            className="border-t"
                            key={item.day + item.kind + item.path}
                          >
                            <td className="p-3">{item.day}</td>
                            <td>{item.kind}</td>
                            <td>{item.path}</td>
                            <td>{item.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!data.metrics?.length && (
                    <div className="studio-panel">
                      <h3>No opted-in visits recorded yet</h3>
                      <p>
                        Visitors must allow anonymous usage counts using the
                        website’s privacy control. Visits made without consent
                        are deliberately excluded.
                      </p>
                      <p className="studio-help">
                        To verify the connection, open the live website, enable
                        “Allow anonymous usage counts for this browser tab”,
                        visit a published page and refresh these counts. Counts
                        are events, not unique visitors.
                      </p>
                      <a
                        href="https://www.khyatigems.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open live website →
                      </a>
                    </div>
                  )}
                </section>
              )}
              {tab === "Enquiries" && (
                <section className="space-y-4">
                  <h2 className="text-xl font-semibold">Website enquiries</h2>
                  <p className="text-sm">
                    Submitted with consent. Acknowledgements use the ERP email
                    settings. Resolving an enquiry does not send a reply.
                  </p>
                  <label className="grid gap-1 text-sm">
                    Find an enquiry by number, name, email or subject
                    <input
                      type="search"
                      className={field}
                      value={enquirySearch}
                      maxLength={200}
                      onChange={(event) => setEnquirySearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          operation(() =>
                            filterEnquiries({ query: enquirySearch, page: 0 }),
                          );
                        }
                      }}
                    />
                  </label>
                  <div className="studio-toolbar">
                    <label className="studio-label">
                      Status
                      <select
                        value={enquiryFilter.status}
                        onChange={(e) =>
                          operation(() =>
                            filterEnquiries({
                              status: e.target.value,
                              page: 0,
                              query: enquirySearch,
                            }),
                          )
                        }
                      >
                        <option value="all">All enquiries</option>
                        <option value="new">Open</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </label>
                    <label className="studio-switch">
                      <input
                        type="checkbox"
                        checked={enquiryFilter.due}
                        onChange={(e) =>
                          operation(() =>
                            filterEnquiries({
                              due: e.target.checked,
                              page: 0,
                              query: enquirySearch,
                            }),
                          )
                        }
                      />
                      Follow-up due
                    </label>
                    <button
                      className={primary}
                      onClick={() =>
                        operation(() =>
                          filterEnquiries({ query: enquirySearch, page: 0 }),
                        )
                      }
                    >
                      Search enquiries
                    </button>
                    <button
                      onClick={() =>
                        operation(async () => {
                          setEnquirySearch("");
                          await filterEnquiries({
                            query: "",
                            status: "all",
                            due: false,
                            page: 0,
                          });
                        })
                      }
                    >
                      Clear filters
                    </button>
                  </div>
                  <p className="studio-help">
                    {data.enquiryPagination?.total ?? data.enquiries.length}{" "}
                    matching enquiries · {data.enquiryPagination?.open ?? 0}{" "}
                    open · {data.enquiryPagination?.due ?? 0} follow-ups due.
                    Search includes all saved records.
                  </p>
                  {data.enquiries.map((e) => (
                    <article
                      key={e.id}
                      className="space-y-3 rounded border p-4"
                    >
                      <h3 className="font-semibold">{e.subject}</h3>
                      <p className="font-mono text-sm">
                        Enquiry number: {e.reference || "Pending allocation"}
                      </p>
                      <label className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={deleteEnquiryId === e.id}
                          onChange={(event) =>
                            setDeleteEnquiryId(event.target.checked ? e.id : "")
                          }
                        />{" "}
                        Confirm permanent deletion of this enquiry
                      </label>
                      <button
                        className={button}
                        disabled={deleteEnquiryId !== e.id}
                        onClick={() =>
                          operation(async () => {
                            await write({
                              type: "enquiry",
                              action: "delete",
                              id: e.id,
                              confirmed: true,
                            });
                            setDeleteEnquiryId("");
                            await load();
                            setMessage("Enquiry deleted.");
                          })
                        }
                      >
                        Delete enquiry
                      </button>
                      <p className="text-sm">
                        {e.name} · {e.email} ·{" "}
                        {new Date(e.createdAt).toLocaleString()} · {e.status}
                      </p>
                      <p className="whitespace-pre-wrap">{e.message}</p>
                      <EnquiryFollowup
                        key={e.id}
                        enquiry={e}
                        save={async (payload) => {
                          await write({
                            type: "enquiry-followup",
                            id: e.id,
                            payload,
                          });
                          await load();
                          setMessage("Follow-up saved.");
                        }}
                      />
                      <p className="text-sm">
                        Last acknowledgement result:{" "}
                        {e.emailStatus || "Not requested"}
                        {e.emailLogId && (
                          <>
                            {" "}
                            ·{" "}
                            <a className="underline" href="/communication">
                              View ERP email log
                            </a>
                          </>
                        )}
                      </p>
                      {e.emailLogId && e.emailStatus === "failed" && (
                        <p className="studio-help">
                          Review this failed delivery and use the retry controls
                          in the ERP email log.
                        </p>
                      )}
                      {!e.emailLogId &&
                        (!e.emailStatus ||
                          ["failed", "disabled", "pending"].includes(
                            e.emailStatus,
                          ) ||
                          (e.emailStatus === "sending" &&
                            !!e.emailUpdatedAt &&
                            Date.parse(e.emailUpdatedAt) <
                              Date.now() - 15 * 60 * 1000)) && (
                          <button
                            className={button}
                            onClick={() =>
                              operation(async () => {
                                await write({
                                  type: "enquiry",
                                  action: "acknowledge",
                                  id: e.id,
                                });
                                await load();
                                setMessage("Acknowledgement status updated.");
                              })
                            }
                          >
                            Send acknowledgement
                          </button>
                        )}
                      <p className="text-sm">
                        <a
                          className="underline"
                          href="/settings/email-templates"
                        >
                          Edit acknowledgement email template
                        </a>
                      </p>
                      <button
                        className={button}
                        onClick={() =>
                          operation(async () => {
                            await write({
                              type: "enquiry",
                              id: e.id,
                              status:
                                e.status === "resolved" ? "new" : "resolved",
                            });
                            await load();
                            setMessage("Enquiry status updated.");
                          })
                        }
                      >
                        {e.status === "resolved" ? "Reopen" : "Mark resolved"}
                      </button>
                    </article>
                  ))}
                  {data.enquiryPagination &&
                    data.enquiryPagination.pages > 1 && (
                      <div className="studio-toolbar">
                        <button
                          disabled={data.enquiryPagination.page === 0}
                          onClick={() =>
                            operation(() =>
                              filterEnquiries({
                                page: data.enquiryPagination!.page - 1,
                              }),
                            )
                          }
                        >
                          Previous page
                        </button>
                        <span>
                          Page {data.enquiryPagination.page + 1} of{" "}
                          {data.enquiryPagination.pages}
                        </span>
                        <button
                          disabled={
                            data.enquiryPagination.page + 1 >=
                            data.enquiryPagination.pages
                          }
                          onClick={() =>
                            operation(() =>
                              filterEnquiries({
                                page: data.enquiryPagination!.page + 1,
                              }),
                            )
                          }
                        >
                          Next page
                        </button>
                      </div>
                    )}
                  {!data.enquiries.length && (
                    <p>No enquiries match these filters.</p>
                  )}
                </section>
              )}
            </fieldset>
          )}
        </div>
      </div>
    </div>
  );
}

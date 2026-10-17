import { articlePath, type PublicArticle } from "@/lib/website/editorial/contract";
const siteOrigin = () => "https://www.khyatigems.com";
import { deliveryUrl } from "@/lib/website/editorial/media";
import { GemIllustration, gemColours } from "./gem-illustration";
export function Article({
  article,
  related,
  preview = false,
}: {
  article: PublicArticle;
  related: PublicArticle[];
  preview?: boolean;
}) {
  const path = articlePath(article);
  const leadImage = article.images.find((asset) => asset.mediaType === "image");
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.summary,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        mainEntityOfPage: siteOrigin() + path,
        publisher: {
          "@type": "Organization",
          name: "KhyatiGems",
          url: siteOrigin(),
        },
        ...(article.review
          ? { reviewedBy: { "@type": "Person", name: article.review.name } }
          : {}),
        image: article.images
          .filter((i) => i.mediaType === "image")
          .map((i) => i.url),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteOrigin(),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: article.kind,
            item: siteOrigin() + path.slice(0, path.lastIndexOf("/")),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: article.title,
            item: siteOrigin() + path,
          },
        ],
      },
    ],
  };
  return (
    <article className="article-page">
      {!preview && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <a href="/">Home</a> /{" "}
        <a href={path.slice(0, path.lastIndexOf("/"))}>{article.kind}</a>{" "}
        / {article.title}
      </nav>
      <header>
        <p className="eyebrow">KhyatiGems knowledge library</p>
        <h1>{article.title}</h1>
        <p className="intro">{article.summary}</p>
        {article.review && (
          <p className="subtle">
            Reviewed by {article.review.name} · {article.review.credentials} ·{" "}
            <time dateTime={article.review.reviewedAt}>
              {article.review.reviewedAt}
            </time>
          </p>
        )}
        {article.sourceReview && (
          <p className="subtle">
            AI-assisted source review · {article.sourceReview.reviewedAt}. No
            named gemologist review is claimed.{" "}
            <a href="/editorial-policy">
              How this reference was reviewed
            </a>
            .
          </p>
        )}
      </header>
      {article.kind === "birthstones" && (
        <section
          className="birthstone-article-links"
          aria-label="Explore this month's gemstones"
        >
          {related
            .filter((a) => a.kind === "gemstones")
            .map((gem) => (
              <a href={articlePath(gem)} key={gem.id}>
                <GemIllustration
                  colour={gemColours[gem.slug]}
                  rounded={["pearl", "moonstone", "opal", "turquoise"].includes(
                    gem.slug,
                  )}
                />
                <span>{gem.title} →</span>
              </a>
            ))}
          <p className="subtle">
            Stylized gemstone illustrations. See the source-labelled photographs
            and material references below.
          </p>
        </section>
      )}
      {leadImage && (
        <figure className="article-lead-photo">
          <img
            src={deliveryUrl(leadImage.url, 1200)}
            alt={leadImage.alt}
            width={leadImage.width || 1200}
            height={leadImage.height || 900}
            fetchPriority="high"
          />
          <figcaption>
            {leadImage.caption}
            <br />
            {leadImage.attribution} · <a href={leadImage.sourceUrl}>Source</a>
            {leadImage.licenseUrl && (
              <>
                {" "}
                ·{" "}
                <a href={leadImage.licenseUrl} rel="license">
                  {leadImage.license}
                </a>
              </>
            )}
          </figcaption>
        </figure>
      )}
      {article.aliases.length > 0 && (
        <p>Also known as: {article.aliases.join(", ")}.</p>
      )}
      {article.properties.length > 0 && (
        <div className="table-scroll">
          <table>
            <caption>Identification and properties</caption>
            <tbody>
              {article.properties.map((p, i) => (
                <tr key={i}>
                  <th scope="row">{p.name}</th>
                  <td>{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className="contents" aria-label="Article contents">
        {article.sections.map((s, i) => (
          <a key={i} href={`#section-${i}`}>
            {s.heading}
          </a>
        ))}
      </nav>
      {article.sections.map((s, i) => (
        <section id={`section-${i}`} key={i}>
          <h2>{s.heading}</h2>
          {s.body.split(/\n\s*\n/).map((p, j) => (
            <p className="prose" key={j}>
              {p}
            </p>
          ))}
        </section>
      ))}
      {article.images.filter((asset) => asset.id !== leadImage?.id).length >
        0 && (
        <section>
          <h2>Specimen examples</h2>
          <p>
            Educational examples do not indicate current availability for sale.
          </p>
          <div className="media-gallery">
            {article.images
              .filter((asset) => asset.id !== leadImage?.id)
              .map((i) => (
                <figure key={i.id}>
                  {i.mediaType === "video" ? (
                    <>
                      <video
                        controls
                        preload="none"
                        poster={i.posterUrl}
                        src={i.url}
                        aria-label={i.alt}
                      >
                        <track
                          kind="captions"
                          src={`/api/captions/${i.id}`}
                          srcLang="en"
                          label="English"
                          default
                        />
                      </video>
                      <details>
                        <summary>Video description and transcript</summary>
                        <p className="prose">{i.transcript}</p>
                      </details>
                    </>
                  ) : (
                    <img
                      src={deliveryUrl(i.url, 1200)}
                      srcSet={[480, 960, 1440]
                        .map(
                          (width) => `${deliveryUrl(i.url, width)} ${width}w`,
                        )
                        .join(", ")}
                      sizes="(max-width: 680px) 88vw, 800px"
                      alt={i.alt}
                      width={i.width || 800}
                      height={i.height || 600}
                      loading="lazy"
                    />
                  )}
                  <figcaption>
                    {i.caption}
                    <br />
                    {i.attribution} ·{" "}
                    <a href={i.sourceUrl} rel="noopener noreferrer">
                      Source
                    </a>{" "}
                    ·{" "}
                    <a href={i.licenseUrl} rel="license noopener noreferrer">
                      {i.license}
                    </a>
                    {i.modifications && <span> · {i.modifications}</span>}
                  </figcaption>
                </figure>
              ))}
          </div>
        </section>
      )}
      {article.faqs.length > 0 && (
        <section>
          <h2>Frequently asked questions</h2>
          {article.faqs.map((f, i) => (
            <details key={i}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </section>
      )}
      <section id="sources">
        <h2>Sources and further reading</h2>
        <ul>
          {article.sources.map((s, i) => (
            <li key={i}>
              <a href={s.url} rel="noopener noreferrer">
                {s.title}
              </a>{" "}
              <span className="subtle">Checked {s.checkedAt}</span>
            </li>
          ))}
        </ul>
        <p>
          <a href="/contact">Suggest a correction</a>
        </p>
      </section>
      {related.length > 0 && (
        <section>
          <h2>Continue researching</h2>
          <ul>
            {related.map((a) => (
              <li key={a.id}>
                <a href={articlePath(a)}>{a.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <aside className="answer">
        <h2>Ask about a gemstone</h2>
        <p>
          <a href="/ask">Ask KhyatiGems</a> or{" "}
          <a href="/contact">contact our team</a>.{" "}
          <a href="/where-to-buy">Find purchase information</a>.
        </p>
      </aside>
    </article>
  );
}

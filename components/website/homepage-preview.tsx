import { Children, isValidElement } from "react";
import {
  articlePath,
  type PublicArticle,
  type PublicFeed,
} from "@/lib/website/editorial/contract";
import { deliveryUrl } from "@/lib/website/editorial/media";
import { BrandHero } from "./brand-hero";
import { ContactForm } from "./forms";
export function Homepage({
  feed,
  preview = false,
}: {
  feed: PublicFeed;
  preview?: boolean;
}) {
  const { settings, articles, homepageMedia = [] } = feed;
  const path = (article: PublicArticle) =>
    (preview ? "/preview" : "") + articlePath(article);
  const gems = articles.filter((article) => article.kind === "gemstones");
  const featured = (
    settings.featuredSlugs.length
      ? settings.featuredSlugs
          .map((slug) => gems.find((article) => article.slug === slug))
          .filter((article): article is PublicArticle => Boolean(article))
      : gems
  ).slice(0, 6);
  const availableGuides = articles.filter(
    (article) => article.kind === "guides",
  );
  const guides = (
    settings.featuredGuideSlugs.length
      ? settings.featuredGuideSlugs
          .map((slug) =>
            availableGuides.find((article) => article.slug === slug),
          )
          .filter((article): article is PublicArticle => Boolean(article))
      : availableGuides
  ).slice(0, 6);
  const heroImage = homepageMedia.find(
    (asset) => asset.id === settings.heroImageId && asset.mediaType === "image",
  );
  const heroVideo = homepageMedia.find(
    (asset) => asset.id === settings.heroVideoId && asset.mediaType === "video",
  );
  const brandImage = homepageMedia.find(
    (asset) =>
      asset.id === settings.brandImageId && asset.mediaType === "image",
  );
  const content = (
    <>
      <BrandHero settings={settings} image={heroImage} video={heroVideo} gallery={settings.heroGalleryIds.map(id=>homepageMedia.find(a=>a.id===id&&a.mediaType==="image")).filter((a):a is NonNullable<typeof a>=>!!a)}/>
      <div className="brand-commitments" aria-label="Our approach">
        <span>Clear gemstone information</span>
        <span>Documentation in context</span>
        <span>Thoughtful questions</span>
        <span>A personal conversation</span>
      </div>
      <section
        data-home-section="discovery"
        className="home-discovery brand-discovery"
      >
        <div>
          <p className="eyebrow">A considered place to begin</p>
          <h2>
            Not sure where
            <br />
            to <i>start?</i>
          </h2>
          <p>
            Begin with a name, follow a question and look beyond colour. The
            encyclopedia brings gemstone properties, treatments and care into
            one place.
          </p>
          <a className="button" href="/gemstones">
            Explore the encyclopedia →
          </a>
          <form
            className="brand-library-search"
            action="/search"
            role="search"
          >
            <label htmlFor="home-query">
              Find a gemstone, guide or topic
            </label>
            <div>
              <input
                type="search"
                name="q"
                id="home-query"
                placeholder="Try ruby, treatment or laboratory reports"
                maxLength={120}
              />
              <button type="submit">Search</button>
            </div>
          </form>
        </div>
        <figure className="brand-discovery-image">
          <img
            src="/media/about-selection.webp"
            alt="Gemstones and examination tools in a KhyatiGems brand composition"
            width={1440}
            height={720}
            loading="lazy"
          />
          <figcaption>Illustrative brand artwork</figcaption>
        </figure>
      </section>
      <section data-home-section="about" className="home-about brand-story">
        <div>
          <p className="eyebrow">Our story</p>
          <h2>
            A gemstone should be
            <br />
            <i>understood before it is chosen.</i>
          </h2>
          <p>
            {settings.about ||
              `${settings.companyName} is the company behind KhyatiGems. We bring together gemstone information and a direct way to ask questions before making a choice.`}
          </p>
          <a className="text-link" href="/about">
            Discover our story →
          </a>
        </div>
        <blockquote>
          <p>
            “We believe a gemstone should be understood before it is chosen.”
          </p>
          <cite>The KhyatiGems approach</cite>
        </blockquote>
        {brandImage && (
          <figure className="brand-story-image">
            <img
              src={deliveryUrl(brandImage.url, 960)}
              alt={brandImage.alt}
              width={960}
              height={640}
              loading="lazy"
            />
            <figcaption>{brandImage.caption}</figcaption>
          </figure>
        )}
      </section>
      <section data-home-section="featured" className="home-featured">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Explore the encyclopedia</p>
            <h2>
              Gemstones with a<br />
              <i>story to tell.</i>
            </h2>
          </div>
          <a href="/gemstones">View all gemstones →</a>
        </div>
        {featured.length ? (
          <div className={`home-feature-grid${featured.length > 4 ? " home-feature-grid-six" : ""}`}>
            {featured.map((article) => {
              const image = article.images.find(
                (asset) => asset.mediaType === "image",
              );
              return (
                <article key={article.id}>
                  {image && (
                    <a className="brand-gem-image" href={path(article)}>
                      <img
                        src={deliveryUrl(image.url, 640)}
                        alt={image.alt}
                        width={640}
                        height={480}
                        loading="lazy"
                      />
                    </a>
                  )}
                  <p className="eyebrow">
                    {article.family || "Gemstone reference"}
                  </p>
                  <h3>
                    <a href={path(article)}>{article.title} ↗</a>
                  </h3>
                  <p>{article.summary}</p>
                  {preview && (
                    <span className="draft-label">Draft for review</span>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="brand-topic-links">
            <a href="/gemstones">Browse the A–Z index →</a>
            <a href="/gemstone-families">Explore gemstone families →</a>
            <a href="/learn">Learn about names and treatments →</a>
          </div>
        )}
      </section>
      <section
        data-home-section="learning"
        className="home-learning brand-certification"
      >
        <figure>
          <img
            src="/media/certification-brand.webp"
            alt="Gemstone examination tools in an illustrative KhyatiGems brand scene"
            width={1440}
            height={720}
            loading="lazy"
          />
          <figcaption>Illustrative brand artwork</figcaption>
        </figure>
        <div>
          <p className="eyebrow">Documentation and evidence</p>
          <h2>
            Confidence begins
            <br />
            with <i>clear information.</i>
          </h2>
          <p>
            Understand what a laboratory report records, match its details to
            the gemstone and recognise the limits of a photograph or a name.
          </p>
          <ul>
            <li>Material identity and description</li>
            <li>Reported treatment information</li>
            <li>The scope of laboratory documentation</li>
          </ul>
          <a className="button" href="/certification">
            Understand certification →
          </a>
        </div>
      </section>
      <section data-home-section="guides" className="home-guides">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Learn before you choose</p>
            <h2>
              Knowledge that makes
              <br />
              <i>choice feel simpler.</i>
            </h2>
          </div>
          <a href="/learn">Explore the knowledge centre →</a>
        </div>
        <div className="home-guide-list">
          {guides.length
            ? guides.map((guide, index) => (
                <article key={guide.id}>
                  <a className="brand-guide-image" href={path(guide)}>
                    <img
                      src={
                        [
                          "/media/knowledge.webp",
                          "/media/certification-brand.webp",
                          "/media/story.webp",
                        ][index]
                      }
                      alt="Illustrative KhyatiGems gemstone education artwork"
                      width={1440}
                      height={720}
                      loading="lazy"
                    />
                  </a>
                  <p className="eyebrow">Gemstone education</p>
                  <h3>
                    <a href={path(guide)}>{guide.title}</a>
                  </h3>
                  <p>{guide.summary}</p>
                  <a className="text-link" href={path(guide)}>
                    Read guide →
                  </a>
                </article>
              ))
            : [
                [
                  "Gemstone names and materials",
                  "/gemstones",
                  "/media/knowledge.webp",
                ],
                [
                  "Reading laboratory documentation",
                  "/certification",
                  "/media/certification-brand.webp",
                ],
                [
                  "Questions before choosing a gemstone",
                  "/contact",
                  "/media/story.webp",
                ],
              ].map(([title, url, image]) => (
                <article key={url}>
                  <a className="brand-guide-image" href={url}>
                    <img
                      src={image}
                      alt="Illustrative KhyatiGems brand artwork"
                      width={1440}
                      height={720}
                      loading="lazy"
                    />
                  </a>
                  <h3>
                    <a href={url}>{title}</a>
                  </h3>
                  <a className="text-link" href={url}>
                    Explore topic →
                  </a>
                </article>
              ))}
        </div>
        <p className="subtle brand-art-note">
          Guide illustrations are brand artwork. Reference photographs are
          identified within individual articles.
        </p>
      </section>
      <section data-home-section="help" className="brand-help">
        <div className="brand-marketplace">
          <div>
            <p className="eyebrow">Where to buy</p>
            <h2>
              Continue your journey
              <br />
              with <i>KhyatiGems.</i>
            </h2>
            <p>
              Explore information here, then contact the team about a particular
              gemstone or purchase channel.
            </p>
            <a className="text-link" href="/where-to-buy">
              Where to buy →
            </a>
          </div>
          <div className="marketplace-brands">
            <figure>
              <img
                src="/marketplaces/etsy.svg"
                alt="Etsy"
                width={180}
                height={80}
              />
              <figcaption>Etsy</figcaption>
            </figure>
            <figure>
              <img
                src="/marketplaces/ebay.svg"
                alt="eBay"
                width={180}
                height={80}
              />
              <figcaption>eBay</figcaption>
            </figure>
            <figure>
              <img
                src="/marketplaces/amazon.svg"
                alt="Amazon"
                width={180}
                height={80}
              />
              <figcaption>Amazon Global</figcaption>
            </figure>
          </div>
        </div>
        <div className="brand-faq">
          <div>
            <p className="eyebrow">Frequently asked questions</p>
            <h2>
              Clarity at every
              <br />
              <i>step of the way.</i>
            </h2>
            <a href="/faq">More questions →</a>
          </div>
          <div>
            <details>
              <summary>Where should I begin my gemstone research?</summary>
              <p>
                Start with the gemstone index. Read the material description,
                treatment information and sources, then ask about any detail
                that remains unclear.
              </p>
            </details>
            <details>
              <summary>
                Does a photograph establish a gemstone’s identity?
              </summary>
              <p>
                A photograph is useful for appearance, but does not establish
                natural origin, treatment status or geographic provenance.
              </p>
            </details>
            <details>
              <summary>Can I buy directly on this website?</summary>
              <p>
                This website is for information and enquiries. Contact
                KhyatiGems about its external purchase channels.
              </p>
            </details>
            <details>
              <summary>How can I ask the team a question?</summary>
              <p>
                Use the enquiry form below or the contact page. Your message
                will be saved for the team to review.
              </p>
            </details>
          </div>
        </div>
        <div className="brand-home-contact">
          <div>
            <p className="eyebrow">We are here to help</p>
            <h2>
              Have a question?
              <br />
              <i>Let’s talk.</i>
            </h2>
            <p>
              Whether you are researching gemstones or looking for something
              specific, tell our team what you would like to understand.
            </p>
            <a href="/ask">Explore Ask KhyatiGems →</a>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
  const blocks = Children.toArray(content.props.children);
  return (
    <>
      {blocks.filter(
        (block) =>
          !isValidElement<{ "data-home-section"?: string }>(block) ||
          !block.props["data-home-section"],
      )}
      {settings.homepageSections.map((key) =>
        blocks.find(
          (block) =>
            isValidElement<{ "data-home-section"?: string }>(block) &&
            block.props["data-home-section"] === key,
        ),
      )}
    </>
  );
}

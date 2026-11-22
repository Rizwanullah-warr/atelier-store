import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getInfoPage, infoHref, infoPages } from "@/lib/info-pages";

export function generateStaticParams() {
  return infoPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata(
  props: PageProps<"/info/[slug]">,
): Promise<Metadata> {
  const page = getInfoPage((await props.params).slug);
  return page ? { title: `${page.title} | Atelier Store` } : {};
}

export default async function InfoPage(props: PageProps<"/info/[slug]">) {
  const page = getInfoPage((await props.params).slug);
  if (!page) notFound();

  const related = infoPages.filter(
    (other) => other.group === page.group && other.slug !== page.slug,
  );

  return (
    <div className="mx-auto grid max-w-[1600px] gap-12 px-4 pb-24 pt-12 md:grid-cols-[220px_1fr] md:px-8 md:pt-20">
      <nav aria-label={page.group} className="order-2 md:order-1">
        <p className="label text-muted">{page.group}</p>
        <ul className="mt-5 space-y-3 text-sm">
          {[page, ...related].map((item) => (
            <li key={item.slug}>
              <Link
                href={infoHref(item.slug)}
                aria-current={item.slug === page.slug ? "page" : undefined}
                className={item.slug === page.slug ? "underline" : "text-muted hover:text-ink"}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <article className="order-1 max-w-2xl md:order-2">
        <h1 className="font-serif text-5xl md:text-6xl">{page.title}</h1>
        {page.draft && (
          <p className="mt-6 border border-line bg-surface px-4 py-3 text-xs text-muted">
            Draft content. This page needs real business details before the store
            launches.
          </p>
        )}
        <div className="mt-10 space-y-8">
          {page.sections.map((section, index) => (
            <section key={index}>
              {section.heading && <h2 className="label mb-3">{section.heading}</h2>}
              <p className="leading-relaxed text-muted">{section.body}</p>
            </section>
          ))}
        </div>
        {page.cta && (
          <Link href={page.cta.href} className="btn btn-solid mt-12">
            {page.cta.label}
          </Link>
        )}
      </article>
    </div>
  );
}

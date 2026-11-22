import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/home/section-heading";
import { collections } from "@/lib/sample-data";

export function FeaturedCollections() {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-16 md:px-8 md:py-28">
      <SectionHeading eyebrow="The Collections" title="Shop by World" />

      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        {collections.map((collection) => (
          <Link
            key={collection.slug}
            href={`/shop/${collection.slug}`}
            className="group relative block aspect-[4/5] overflow-hidden bg-surface md:aspect-[3/4]"
          >
            <Image
              src={collection.image}
              alt={collection.title}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-paper md:p-8">
              <h3 className="font-serif text-3xl md:text-4xl">
                {collection.title}
              </h3>
              <p className="mt-2 text-sm text-paper/80">
                {collection.description}
              </p>
              <span className="label link-underline mt-5 inline-block">
                Discover
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

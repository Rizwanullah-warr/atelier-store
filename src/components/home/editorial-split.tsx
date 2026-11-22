import Image from "next/image";
import Link from "next/link";

import { editorials } from "@/lib/sample-data";

export function EditorialSplit() {
  return (
    <section className="grid md:grid-cols-2">
      {editorials.map((story) => (
        <Link
          key={story.title}
          href={story.href}
          className="group relative block aspect-[4/5] overflow-hidden bg-surface md:aspect-auto md:h-[90svh] md:min-h-[640px]"
        >
          <Image
            src={story.image}
            alt={story.title}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-center text-paper md:p-12">
            <p className="label">{story.eyebrow}</p>
            <h2 className="mt-3 font-serif text-4xl md:text-6xl">
              {story.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xs text-sm text-paper/85">
              {story.description}
            </p>
            <span className="btn btn-light mt-6">Explore</span>
          </div>
        </Link>
      ))}
    </section>
  );
}

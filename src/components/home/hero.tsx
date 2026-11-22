import Image from "next/image";
import Link from "next/link";

import { hero } from "@/lib/sample-data";

export function Hero() {
  return (
    <section className="relative h-[calc(100svh-6.5rem)] min-h-[520px] overflow-hidden md:h-[calc(100svh-9.25rem)]">
      <Image
        src={hero.image}
        alt="Model in a long checked coat walking down a city street"
        fill
        preload
        sizes="100vw"
        className="object-cover object-[50%_30%]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 px-4 pb-12 text-paper md:px-8 md:pb-20">
        <div className="mx-auto max-w-[1600px] md:text-center">
          <p className="label">{hero.eyebrow}</p>
          <h1 className="mt-4 font-serif text-5xl leading-[0.95] sm:text-6xl md:text-8xl">
            {hero.title}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-paper/85 md:mx-auto md:text-base">
            {hero.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 md:justify-center">
            <Link href="/shop/women" className="btn btn-light">
              Shop Women
            </Link>
            <Link href="/shop/men" className="btn btn-light">
              Shop Men
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

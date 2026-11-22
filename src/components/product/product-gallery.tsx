import Image from "next/image";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  return (
    <>
      {/* Mobile: full-width swipeable strip. */}
      <div className="-mx-4 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:hidden">
        {images.map((src, index) => (
          <div
            key={src}
            className="relative aspect-[3/4] w-full shrink-0 snap-center bg-surface"
          >
            <Image
              src={src}
              alt={index === 0 ? name : `${name}, detail ${index}`}
              fill
              fetchPriority={index === 0 ? "high" : "auto"}
              sizes="100vw"
              className="object-cover"
            />
            <span className="label absolute bottom-3 right-3 bg-paper/90 px-2 py-1 text-[0.5625rem]">
              {index + 1} / {images.length}
            </span>
          </div>
        ))}
      </div>

      {/* Desktop: two-column grid of large images. */}
      <div className="hidden grid-cols-2 gap-2 lg:grid">
        {images.map((src, index) => (
          <div key={src} className="relative aspect-[3/4] bg-surface">
            <Image
              src={src}
              alt={index === 0 ? name : `${name}, detail ${index}`}
              fill
              fetchPriority={index === 0 ? "high" : "auto"}
              sizes="(min-width: 1024px) 30vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </>
  );
}

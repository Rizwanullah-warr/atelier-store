import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  link,
}: {
  eyebrow: string;
  title: string;
  link?: { label: string; href: string };
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 md:mb-12">
      <div>
        <p className="label text-muted">{eyebrow}</p>
        <h2 className="mt-3 font-serif text-3xl md:text-5xl">{title}</h2>
      </div>
      {link && (
        <Link href={link.href} className="label link-underline shrink-0">
          {link.label}
        </Link>
      )}
    </div>
  );
}

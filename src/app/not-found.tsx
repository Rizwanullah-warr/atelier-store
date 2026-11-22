import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
      <p className="label text-muted">404</p>
      <h1 className="mt-4 font-serif text-4xl md:text-5xl">
        This page could not be found
      </h1>
      <p className="mt-4 text-sm text-muted">
        The piece you are looking for may have moved or is no longer available.
      </p>
      <Link href="/" className="btn btn-solid mt-10">
        Return Home
      </Link>
    </section>
  );
}

import { services } from "@/lib/sample-data";

export function ServicesStrip() {
  return (
    <section className="border-t border-line bg-surface">
      <ul className="mx-auto grid max-w-[1600px] grid-cols-2 gap-x-4 gap-y-10 px-4 py-14 md:px-8 lg:grid-cols-4">
        {services.map((service) => (
          <li key={service.title} className="text-center">
            <h3 className="label">{service.title}</h3>
            <p className="mt-3 text-sm text-muted">{service.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { EditorialSplit } from "@/components/home/editorial-split";
import { FeaturedCollections } from "@/components/home/featured-collections";
import { Hero } from "@/components/home/hero";
import { ProductRow } from "@/components/home/product-row";
import { ServicesStrip } from "@/components/home/services-strip";
import { getNewArrivals, getProductsByCategorySlugs } from "@/db/queries/products";

const ACCESSORY_CATEGORIES = ["bags", "shoes", "eyewear", "jewelry"];

export default async function Home() {
  const [newArrivals, accessories] = await Promise.all([
    getNewArrivals(),
    getProductsByCategorySlugs(ACCESSORY_CATEGORIES),
  ]);

  return (
    <>
      <Hero />
      <ProductRow
        eyebrow="Just In"
        title="New Arrivals"
        products={newArrivals}
        viewAllHref="/new-arrivals"
      />
      <FeaturedCollections />
      <EditorialSplit />
      <ProductRow
        eyebrow="Finishing Touches"
        title="The Accessories Edit"
        products={accessories}
        viewAllHref="/shop/accessories"
      />
      <ServicesStrip />
    </>
  );
}

"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { SlidersHorizontal, LayoutGrid, List, ChevronLeft, ChevronRight, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PlaceCard } from "@/components/place-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const mockResults = [
  { id: "1", title: "The Grand Budapest", location: "Budapest, Hungary", rating: 4.7, price: "$189/night", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80", category: "Hotel", href: "/hotels/grand-budapest" },
  { id: "2", title: "Le Petit Bistro", location: "Paris, France", rating: 4.5, price: "$$$", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80", category: "Restaurant", href: "/restaurants/le-petit-bistro" },
  { id: "3", title: "Santorini Sunset Suite", location: "Santorini, Greece", rating: 4.9, price: "$320/night", image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80", category: "Hotel", href: "/hotels/santorini-sunset" },
  { id: "4", title: "Tokyo Street Food Tour", location: "Tokyo, Japan", rating: 4.8, price: "$75/person", image: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80", category: "Experience", href: "/experiences/tokyo-food-tour" },
  { id: "5", title: "Amalfi Coast Drive", location: "Amalfi, Italy", rating: 4.6, price: "$55/day", image: "https://images.unsplash.com/photo-1534008897995-27a23e859048?w=600&q=80", category: "Rental", href: "/rentals/amalfi-drive" },
  { id: "6", title: "Marina Bay Sands", location: "Singapore", rating: 4.7, price: "$410/night", image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80", category: "Hotel", href: "/hotels/marina-bay-sands" },
  { id: "7", title: "Trattoria da Mario", location: "Rome, Italy", rating: 4.4, price: "$$", image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80", category: "Restaurant", href: "/restaurants/trattoria-da-mario" },
  { id: "8", title: "Bali Surf Camp", location: "Canggu, Bali", rating: 4.6, price: "$40/person", image: "https://images.unsplash.com/photo-1502680390548-bdbac40ae4ea?w=600&q=80", category: "Experience", href: "/experiences/bali-surf" },
  { id: "9", title: "Mediterranean Cruise", location: "Barcelona to Athens", rating: 4.5, price: "$1,890/person", image: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=600&q=80", category: "Cruise", href: "/cruises/med-cruise" },
  { id: "10", title: "Riad Yasmine", location: "Marrakech, Morocco", rating: 4.8, price: "$145/night", image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80", category: "Hotel", href: "/hotels/riad-yasmine" },
  { id: "11", title: "Northern Lights Safari", location: "Tromso, Norway", rating: 4.9, price: "$220/person", image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&q=80", category: "Experience", href: "/experiences/northern-lights" },
  { id: "12", title: "Lisbon Vintage Tram Tour", location: "Lisbon, Portugal", rating: 4.3, price: "$30/person", image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=80", category: "Experience", href: "/experiences/lisbon-tram" },
];

const categoryOptions = ["Hotel", "Restaurant", "Experience", "Rental", "Cruise", "Flight"];
const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "rating", label: "Rating (High to Low)" },
  { value: "price-low", label: "Price (Low to High)" },
  { value: "price-high", label: "Price (High to Low)" },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("relevance");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const perPage = 6;

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
    setPage(1);
  };

  const filtered = useMemo(() => {
    let items = [...mockResults];
    if (selectedCategories.length > 0) items = items.filter((i) => selectedCategories.includes(i.category));
    if (minRating > 0) items = items.filter((i) => i.rating >= minRating);
    if (sortBy === "rating") items.sort((a, b) => b.rating - a.rating);
    return items;
  }, [selectedCategories, minRating, sortBy]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const filterSidebar = (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Category</h3>
        <div className="space-y-2">
          {categoryOptions.map((cat) => (
            <label key={cat} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => toggleCategory(cat)} className="rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
              {cat}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Price Range</h3>
        <div className="flex items-center gap-2">
          <Input placeholder="Min" type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="text-sm" />
          <span className="text-slate-400">-</span>
          <Input placeholder="Max" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="text-sm" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Minimum Rating</h3>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setMinRating(minRating === star ? 0 : star)} className="p-1">
              <Star className={cn("h-5 w-5", star <= minRating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200 hover:fill-amber-200 hover:text-amber-200")} />
            </button>
          ))}
          {minRating > 0 && <span className="text-xs text-slate-500 ml-2 self-center">{minRating}+ stars</span>}
        </div>
      </div>
      <div>
        <Select label="Sort by" options={sortOptions} value={sortBy} onChange={(e) => setSortBy(e.target.value)} />
      </div>
    </div>
  );

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {query ? (<>Results for &ldquo;<span className="text-sky-600">{query}</span>&rdquo;</>) : "Browse All"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{filtered.length} {filtered.length === 1 ? "result" : "results"} found</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Filters</h2>
              {filterSidebar}
            </div>
          </aside>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedCategories.map((cat) => (
                  <Badge key={cat} variant="default" className="gap-1">{cat}<button onClick={() => toggleCategory(cat)}><X className="h-3 w-3" /></button></Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowFilters(!showFilters)}>
                  <SlidersHorizontal className="h-4 w-4 mr-1" />Filters
                </Button>
                <div className="hidden sm:flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                  <button onClick={() => setViewMode("grid")} className={cn("p-2 rounded-l-lg transition-colors", viewMode === "grid" ? "bg-sky-50 text-sky-600" : "text-slate-400 hover:text-slate-600")}><LayoutGrid className="h-4 w-4" /></button>
                  <button onClick={() => setViewMode("list")} className={cn("p-2 rounded-r-lg transition-colors", viewMode === "list" ? "bg-sky-50 text-sky-600" : "text-slate-400 hover:text-slate-600")}><List className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
            {showFilters && (
              <div className="lg:hidden mb-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-900 dark:text-white">Filters</h2>
                  <button onClick={() => setShowFilters(false)}><X className="h-5 w-5 text-slate-400" /></button>
                </div>
                {filterSidebar}
              </div>
            )}
            {paginated.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No results found</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try adjusting your filters or search terms</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginated.map((item) => (<PlaceCard key={item.id} {...item} />))}
              </div>
            ) : (
              <div className="space-y-4">
                {paginated.map((item) => (
                  <Link key={item.id} href={item.href} className="flex gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="relative w-48 h-36 shrink-0 bg-slate-100 dark:bg-slate-800"><Image src={item.image} alt={item.title} fill className="object-cover" sizes="192px" unoptimized /></div>
                    <div className="flex-1 py-4 pr-4">
                      <Badge variant="default" className="mb-1">{item.category}</Badge>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.location}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.rating}</span></div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.price}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4 mr-1" />Prev</Button>
                <span className="text-sm text-slate-500 dark:text-slate-400 px-4">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><p className="text-slate-500 dark:text-slate-400">Loading search...</p></div>}>
      <SearchContent />
    </Suspense>
  );
}

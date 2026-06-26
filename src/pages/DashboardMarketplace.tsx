import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  Layers, 
  ArrowUpRight, 
  Check, 
  Star, 
  Sparkles, 
  CreditCard, 
  ShoppingCart, 
  Tag, 
  Eye, 
  Compass, 
  X, 
  HelpCircle,
  FileText,
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'framer' | 'ecommerce' | 'googleforms' | 'landing';
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  image: string;
  creator: string;
  features: string[];
  pages: number;
  framerCompatible: boolean;
  googleFormsCompatible: boolean;
  wooCommerceCompatible: boolean;
}

const PREMIUM_TEMPLATES: Template[] = [
  {
    id: "tpl_1",
    name: "SaaS Premium Launcher Theme",
    description: "High-conversion SaaS template with beautiful contact sections, pricing cards, and native PluginFoundry Google Forms connector bindings pre-integrated.",
    category: "framer",
    price: 49,
    originalPrice: 89,
    rating: 4.9,
    reviews: 42,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
    creator: "PixelForge",
    features: ["5 High-Fidelity Pages", "Turnstile CAPTCHA Ready", "Full Framer Layout Controls", "Custom Page Loading Animation"],
    pages: 5,
    framerCompatible: true,
    googleFormsCompatible: true,
    wooCommerceCompatible: false
  },
  {
    id: "tpl_2",
    name: "E-Commerce Swift Storefront",
    description: "A fast, beautifully spaced minimalist shop landing template, integrated with WooCommerce Webhook sync for real-time inventories and cart checkouts.",
    category: "ecommerce",
    price: 69,
    originalPrice: 120,
    rating: 4.8,
    reviews: 29,
    image: "https://images.unsplash.com/photo-1472851294608-062f824d296e?auto=format&fit=crop&w=600&q=80",
    creator: "CommerceStudio",
    features: ["Multi-product Carousel", "AJAX Cart Simulator", "Dark & Light Mode Support", "WooCommerce Sync Configured"],
    pages: 3,
    framerCompatible: true,
    googleFormsCompatible: false,
    wooCommerceCompatible: true
  },
  {
    id: "tpl_3",
    name: "Aero Minimalist Feedback Form",
    description: "An ultra-clean single-page survey form theme with beautiful soft shadow inputs and immediate API proxy submission for zero spam submissions.",
    category: "googleforms",
    price: 19,
    originalPrice: 35,
    rating: 4.7,
    reviews: 18,
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
    creator: "FramerFlow",
    features: ["Subtle Input Animations", "Multi-step Form Wizard Option", "Fully Mobile Optimized Theme", "API Endpoint Protection Built-in"],
    pages: 1,
    framerCompatible: true,
    googleFormsCompatible: true,
    wooCommerceCompatible: false
  },
  {
    id: "tpl_4",
    name: "Bento Portfolios & Leads",
    description: "Stunning grid-based Bento layout designed for agencies and freelancers to showcase services and securely capture contact submissions using forms.",
    category: "landing",
    price: 29,
    originalPrice: 59,
    rating: 4.9,
    reviews: 55,
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80",
    creator: "GridLabs",
    features: ["Interactive Bento Hover", "3 Custom Contact Variants", "Fluid Canvas Animations", "Zero-Latency Client Performance"],
    pages: 4,
    framerCompatible: true,
    googleFormsCompatible: true,
    wooCommerceCompatible: false
  },
  {
    id: "tpl_5",
    name: "Deco Retro Apparel Webstore",
    description: "Warm Brutalist retro ecommerce template. Features dynamic listings, heavy text pairings, and pre-mapped orders hooks linking to our WooCommerce core service.",
    category: "ecommerce",
    price: 59,
    originalPrice: 99,
    rating: 4.6,
    reviews: 14,
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80",
    creator: "HyperStudio",
    features: ["Responsive Grid System", "Cool CSS Animated Buttons", "Pre-structured Webhook Actions", "Retro Typography Pairings Included"],
    pages: 6,
    framerCompatible: false,
    wooCommerceCompatible: true,
    googleFormsCompatible: false
  },
  {
    id: "tpl_6",
    name: "Corporate Leads Engine Page",
    description: "Professional high-trust layout for financial and enterprise firms utilizing secure validation modules. Fully compliant with GDPR and secure CAPTCHAs.",
    category: "landing",
    price: 39,
    originalPrice: 79,
    rating: 4.8,
    reviews: 22,
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    creator: "PixelForge",
    features: ["GDPR Policy Block Template", "Turnstile siteverify Pre-wired", "Typography set in Space Grotesk", "Retina display background elements"],
    pages: 2,
    framerCompatible: true,
    googleFormsCompatible: true,
    wooCommerceCompatible: false
  }
];

export default function DashboardMarketplace() {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-templates'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'success'>('form');

  // simulated billing card inputs
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [isLoading, setIsLoading] = useState(false);

  // Load owned templates from local storage
  useEffect(() => {
    const stored = localStorage.getItem('purchased_templates_v1');
    if (stored) {
      try {
        setPurchasedIds(JSON.parse(stored));
      } catch (e) {
        // Fallback
      }
    } else {
      // Default template 3 is unlocked
      const defaults = ['tpl_3'];
      setPurchasedIds(defaults);
      localStorage.setItem('purchased_templates_v1', JSON.stringify(defaults));
    }
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return PREMIUM_TEMPLATES.filter(tpl => {
      const matchesCategory = selectedCategory === 'all' || tpl.category === selectedCategory;
      const matchesSearch = tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tpl.creator.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Sort templates
  const sortedTemplates = useMemo(() => {
    const list = [...filteredTemplates];
    if (sortBy === 'price-asc') {
      return list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      return list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      return list.sort((a, b) => b.rating - a.rating);
    }
    // Default popular sorted by reviews count
    return list.sort((a, b) => b.reviews - a.reviews);
  }, [filteredTemplates, sortBy]);

  // User's owned templates array
  const ownedTemplates = useMemo(() => {
    return PREMIUM_TEMPLATES.filter(tpl => purchasedIds.includes(tpl.id));
  }, [purchasedIds]);

  const handleOpenCheckout = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setCheckoutStep('form');
    setIsCheckoutOpen(true);
  };

  const handleProcessPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setIsLoading(true);

    // Simulate merchant processing
    setTimeout(() => {
      setIsLoading(false);
      const updated = [...purchasedIds, selectedTemplate.id];
      setPurchasedIds(updated);
      localStorage.setItem('purchased_templates_v1', JSON.stringify(updated));
      setCheckoutStep('success');
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in font-sans p-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-tr from-slate-900 to-slate-850 dark:from-slate-950 dark:to-slate-900 text-white p-8 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Launch Ready Themes
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-sans">Template Marketplace</h1>
          <p className="text-slate-300 max-w-xl text-sm">
            Acquire premium, pre-configured Framer components and storefront layouts optimized to hook into your PluginFoundry APIs with secure proxies and CAPTCHAs.
          </p>
        </div>

        <div className="flex gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 z-10">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'browse'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Compass className="h-4 w-4" />
            Browse Marketplace
          </button>
          <button
            onClick={() => setActiveTab('my-templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
              activeTab === 'my-templates'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            My Purchased Templates
            {ownedTemplates.length > 0 && (
              <span className="absolute -top-1.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white border border-slate-955 animate-pulse">
                {ownedTemplates.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'browse' ? (
        <div className="space-y-6">
          {/* Filters & Search bar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
            {/* Search Box */}
            <div className="relative lg:col-span-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search templates, creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 pl-10 pr-4 py-2 rounded-lg text-sm border border-border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
              />
            </div>

            {/* Category Select Filters */}
            <div className="flex flex-wrap items-center gap-1.5 lg:col-span-5">
              <span className="text-xs text-muted-foreground font-semibold px-2 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter:
              </span>
              {[
                { id: 'all', label: 'All Layouts' },
                { id: 'framer', label: 'Framer Canvas' },
                { id: 'ecommerce', label: 'E-Commerce' },
                { id: 'googleforms', label: 'Google Forms' },
                { id: 'landing', label: 'Landing Pages' }
              ].map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === category.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-muted-foreground'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* Sorting Select */}
            <div className="flex items-center gap-2 lg:col-span-3 justify-end">
              <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900/50 border border-border text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
              >
                <option value="popular">Most Popular</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          {/* Catalog grid */}
          {sortedTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTemplates.map((tpl) => {
                const isOwned = purchasedIds.includes(tpl.id);
                return (
                  <div 
                    key={tpl.id}
                    className="group bg-card transition-all rounded-xl border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 overflow-hidden flex flex-col h-full relative"
                  >
                    {/* Badge Compatibility */}
                    <div className="absolute top-3 left-3 flex gap-1 z-10">
                      {tpl.framerCompatible && (
                        <span className="bg-slate-900/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700/50">
                          framer compatible
                        </span>
                      )}
                      {tpl.wooCommerceCompatible && (
                        <span className="bg-purple-600/95 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/50">
                          wooCommerce sync
                        </span>
                      )}
                    </div>

                    {/* Image Preview */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <img 
                        src={tpl.image} 
                        alt={tpl.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-white text-xs font-bold bg-slate-900/80 px-2.5 py-1 rounded backdrop-blur border border-slate-700/50 flex items-center gap-1">
                          Created by {tpl.creator}
                        </span>
                      </div>
                    </div>

                    {/* Meta Content */}
                    <div className="p-5 flex-col flex flex-1 space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-semibold text-emerald-500 flex items-center gap-1 capitalize">
                            <Tag className="h-3 w-3" /> {tpl.category === 'googleforms' ? 'Google Forms' : tpl.category}
                          </span>
                          <span className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 font-bold px-1.5 py-0.5 rounded text-[11px]">
                            <Star className="h-3.5 w-3.5 fill-current" /> {tpl.rating.toFixed(1)} ({tpl.reviews})
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-foreground tracking-tight group-hover:text-primary transition-colors text-left">
                          {tpl.name}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed text-left line-clamp-2 h-8">
                          {tpl.description}
                        </p>
                      </div>

                      {/* Technical Specs checklist */}
                      <div className="border-y border-border/80 py-2.5 space-y-2">
                        <div className="grid grid-cols-2 text-[11px] gap-y-1 font-medium text-muted-foreground text-left">
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            • Pages: <strong>{tpl.pages}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            • Forms Target: <strong>{tpl.googleFormsCompatible ? 'Active' : 'N/A'}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            • Webhooks Config: <strong>{tpl.wooCommerceCompatible ? 'Yes' : 'No'}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            • License: <strong>Commercial</strong>
                          </span>
                        </div>
                      </div>

                      {/* CTA & Price Action lines */}
                      <div className="pt-2 mt-auto flex items-center justify-between gap-2">
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] text-muted-foreground line-through font-semibold font-mono">
                            ${tpl.originalPrice}
                          </span>
                          <span className="text-xl font-black text-foreground font-mono">
                            ${tpl.price}
                          </span>
                        </div>

                        {isOwned ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('my-templates');
                              const el = document.getElementById(tpl.id);
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="flex items-center gap-1 py-2 px-3 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded-lg font-bold transition-all cursor-pointer"
                          >
                            <Check className="h-4 w-4 text-emerald-500" />
                            Owned (View)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenCheckout(tpl)}
                            className="flex items-center gap-1.5 py-2 px-4 text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg rounded-lg font-bold transition-all cursor-pointer"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Get License
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center bg-card rounded-2xl border border-dashed border-border py-12 px-6 flex flex-col items-center justify-center space-y-3">
              <Compass className="h-12 w-12 text-slate-300 dark:text-slate-700" />
              <h3 className="font-bold text-base">No templates found matches filters</h3>
              <p className="text-xs text-muted-foreground">Try broadening your queries, resetting the search keyword or selecting "All Layouts".</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-xs text-emerald-500 font-bold underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      ) : (
        /* OWNED LAYOOUTS TAB */
        <div className="space-y-6">
          <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl border border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-500" />
              <span className="text-xs text-muted-foreground font-semibold">
                You currently own <strong className="text-foreground">{ownedTemplates.length}</strong> active template keys. Paste your copy routes inside Framer components.
              </span>
            </div>
            <button 
              onClick={() => setActiveTab('browse')}
              className="text-xs text-emerald-500 hover:underline font-bold"
            >
              Get more layouts &rarr;
            </button>
          </div>

          {ownedTemplates.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {ownedTemplates.map((tpl) => (
                <div 
                  key={tpl.id}
                  id={tpl.id}
                  className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col md:flex-row gap-5 items-start text-left"
                >
                  <div className="w-full md:w-40 h-28 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                    <img 
                      src={tpl.image} 
                      alt={tpl.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Active License Key
                      </span>
                      <h3 className="font-bold text-base leading-tight mt-1">{tpl.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="bg-slate-100/50 dark:bg-slate-950 p-2.5 rounded-lg border border-border/80 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span>Framer Integration URL:</span>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Pre-Compiled</span>
                      </div>
                      <div className="text-[10px] bg-white dark:bg-slate-900 border border-border/40 px-2 py-1.5 rounded select-all font-mono text-emerald-500 truncate">
                        https://framer.com/m/FramerGoogleForm-NYPedc.js@e2ZereloMPXmmxflwctT
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                        <Clock className="h-3.5 w-3.5" /> Updates Included
                      </span>
                      <div className="flex items-center gap-2">
                        {tpl.googleFormsCompatible && (
                          <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-bold">
                            Forms Connected
                          </span>
                        )}
                        {tpl.wooCommerceCompatible && (
                          <span className="text-[10px] text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded font-bold">
                            Woo Sync Pre-wired
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center bg-card rounded-2xl border border-dashed border-border py-20 px-6 flex flex-col items-center justify-center space-y-3">
              <ShoppingBag className="h-12 w-12 text-slate-300 dark:text-slate-700" />
              <h3 className="font-bold text-base">Your asset library is empty</h3>
              <p className="text-xs text-muted-foreground">Select high quality templates or landing cards designed with security verification mechanisms.</p>
              <button
                onClick={() => setActiveTab('browse')}
                className="bg-emerald-500 text-white px-5 py-2 text-xs font-bold rounded-lg shadow-md hover:bg-emerald-600 transition-all cursor-pointer"
              >
                Explore Premium Themes
              </button>
            </div>
          )}
        </div>
      )}

      {/* CHECKOUT MODAL DOCK */}
      {isCheckoutOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-full cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {checkoutStep === 'form' ? (
              <form onSubmit={handleProcessPurchase} className="flex flex-col text-left">
                {/* Header title */}
                <div className="bg-slate-100 dark:bg-slate-900 p-5 border-b border-border">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold uppercase tracking-wider mb-0.5">
                    <CreditCard className="h-3.5 w-3.5" /> Securing License Connection
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Secure Checkout</h3>
                  <p className="text-xs text-muted-foreground">Finalizing commercial license keys for template files.</p>
                </div>

                {/* Body details */}
                <div className="p-6 space-y-4">
                  {/* Summary row */}
                  <div className="flex gap-4 p-3.5 bg-slate-100/50 dark:bg-slate-900/80 rounded-xl border border-border/80">
                    <img
                      src={selectedTemplate.image}
                      alt={selectedTemplate.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-12 object-cover rounded border border-border"
                    />
                    <div className="flex-1 space-y-0.5">
                      <h4 className="text-xs font-black truncate">{selectedTemplate.name}</h4>
                      <p className="text-[10px] text-muted-foreground">Standard Commercial License</p>
                      <span className="text-[11px] text-primary font-bold">Includes permanent security proxy support</span>
                    </div>
                    <div className="font-semibold text-sm font-mono whitespace-nowrap self-center text-right">
                      ${selectedTemplate.price}
                    </div>
                  </div>

                  {/* Card Details form fields */}
                  <div className="space-y-3 font-sans">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">
                        Cardholder Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="e.g. Studiolazin Dev"
                        className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg text-xs font-medium border border-border focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">
                          Credit Card Number
                        </label>
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4111 2222 3333 4444"
                          className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg text-xs font-mono border border-border focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">
                          Expiry
                        </label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg text-xs font-mono border border-border focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing Total Summary block */}
                  <div className="border-t border-border pt-4 space-y-1.5 font-sans">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="font-mono">${selectedTemplate.price}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Processing Fees:</span>
                      <span className="text-emerald-500 font-bold">$0.00 WAIVED</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-black text-foreground border-t border-border/80 pt-2 text-sm">
                      <span>Order Total:</span>
                      <span className="font-mono text-emerald-500 text-base">${selectedTemplate.price}</span>
                    </div>
                  </div>
                </div>

                {/* Footer action buttons */}
                <div className="p-5 border-t border-border/80 bg-slate-50 dark:bg-slate-900/40 flex justify-between gap-3 font-sans">
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="flex-1 py-2 text-xs border border-border bg-card text-foreground hover:bg-slate-100 rounded-lg font-bold transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-2 py-2 px-4 text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-75 text-white shadow-md rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 animate-spin border-2 border-white/30 border-t-white rounded-full"></span>
                        Verifying Credit profile...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        Securely Authorize & Pay ${selectedTemplate.price}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ORDER SUCCESS SCREEN */
              <div className="p-8 text-center space-y-5 animate-scale-up">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 flex items-center justify-center rounded-full mx-auto border border-emerald-500/20">
                  <Check className="h-8 w-8 text-emerald-500 stroke-[3px]" />
                </div>

                <div className="space-y-1.5 font-sans justify-center">
                  <div className="inline-flex py-0.5 px-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 font-bold text-[10px] uppercase">
                    Order Authenticated Successfully
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground">Purchase Confirmed</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Commercial license credentials have been provisioned on PluginFoundry databases for <strong>{selectedTemplate.name}</strong>.
                  </p>
                </div>

                <div className="bg-slate-100 dark:bg-slate-900 border border-border p-4.5 rounded-xl text-left max-w-md mx-auto space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/80 pb-2">
                    <span>Transaction ID:</span>
                    <strong className="text-slate-800 dark:text-slate-200">TXN-{Math.random().toString(36).substring(3, 9).toUpperCase()}</strong>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-300">How to use this component:</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      1. Go to your Framer project workspace.<br />
                      2. Add a new custom **Code Component**.<br />
                      3. Paste the copyable TSX component code provided in your Google Form manuals.<br />
                      4. In the Framer properties panel, input this asset's active ID and set the Backend URL to bind secure spam proxies immediately!
                    </p>
                  </div>
                </div>

                <div className="pt-2 font-sans">
                  <button
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      setActiveTab('my-templates');
                    }}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 py-2.5 px-4 text-xs font-bold rounded-lg hover:opacity-90 transition-all cursor-pointer text-center"
                  >
                    Go to My Purchased Assets
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

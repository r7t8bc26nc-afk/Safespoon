import React, { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONS ---
const ArrowLeft = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

// --- STATIC BLOG DATA ---
const STATIC_POSTS = [
  {
    id: 'dining-out-safely',
    title: "How to Eat Out Without Fear: The Server Script",
    category: "Dining Out",
    author: "Quajaee Simmons",
    date: "Jan 18, 2026",
    readTime: "5 min",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
    excerpt: "Stop guessing. Use this exact script to communicate your allergies to restaurant staff.",
    content: `
      <p class="lead">For the 32 million Americans with food allergies, the simple question "Where should we eat?" can often induce panic. But with the right strategy, you can reclaim the joy of a restaurant meal.</p>
      
      <h3>The "Chef Card" Strategy</h3>
      <p>Your first line of defense is a physical visual aid. We recommend carrying a "Chef Card" (available from <a href="https://www.foodallergy.org/resources/chef-cards" target="_blank" class="text-emerald-600 font-bold hover:underline">FARE</a>) that lists your specific allergies. Handing this to your server removes the dangerous game of "telephone" between the front of house and the kitchen.</p>
      
      <h3>The Script</h3>
      <p>When ordering, be direct. Don't say "I'm avoiding gluten." Say: <br/><em>"I have a severe medical allergy to wheat. Can you please check with the chef if this dish can be prepared in a clean pan to avoid cross-contact?"</em></p>
    `
  },
  {
    id: 'identifying-cross-contact',
    title: "Spotting Hidden Allergens: A Kitchen Safety Guide",
    category: "Kitchen Safety",
    author: "Quajaee Simmons",
    date: "Jan 05, 2026",
    readTime: "4 min",
    image: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&w=1200&q=80",
    excerpt: "Ordering 'gluten-free' isn't enough if the preparation surface is contaminated. Learn the red flags.",
    content: `
      <p>You ordered the gluten-free pizza. The crust is certified gluten-free. But were the toppings grabbed from a bin full of crumbs? This is the reality of <strong>Cross-Contact</strong>.</p>
      <p>According to the <a href="https://www.fda.gov/food/food-allergensgluten-free-guidance-documents-regulatory-information/food-allergens-what-you-need-know" target="_blank" class="text-emerald-600 font-bold hover:underline">FDA</a>, even a microscopic amount of an allergen can trigger anaphylaxis. When dining out, ask if the kitchen uses dedicated fryers and cutting boards.</p>
    `
  },
  {
    id: 'trusted-chains',
    title: "Trusted Chains: 5 Spots with Verified Protocols",
    category: "Recommendations",
    author: "Quajaee Simmons",
    date: "Dec 20, 2025",
    readTime: "6 min",
    image: "https://images.unsplash.com/photo-1554679665-f5537f187268?auto=format&fit=crop&w=1200&q=80",
    excerpt: "We audited 20 fast-casual chains on their transparency. See why Chipotle and Sweetgreen score high.",
    content: `
      <p>Fast food used to be a "no-go" zone for the allergy-conscious. Fortunately, the rise of "fast-casual" dining has brought transparency to the forefront.</p>
      <h3>Top Performer: Chipotle</h3>
      <p>Chipotle remains a gold standard because their menu is simple. Aside from the flour tortillas (wheat), almost everything else is naturally gluten-free.</p>
    `
  },
  {
    id: 'budget-friendly-allergies',
    title: "Stop Overpaying: The 'Allergy Tax' Survival Guide",
    category: "Shopping Smart",
    author: "Quajaee Simmons",
    date: "Nov 15, 2025",
    readTime: "5 min",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    excerpt: "Gluten-free bread shouldn't bankrupt you. Here are 3 strategies to lower your grocery bill.",
    content: `
      <p>It's often called the "Allergy Tax"—the phenomenon where safe versions of staple foods cost 200% more than their standard counterparts. But eating safely doesn't have to be expensive.</p>
      <h3>Focus on Whole Foods</h3>
      <p>The most expensive items are usually processed "substitutes". Potatoes, rice, beans, and fresh meats are naturally allergen-free and significantly cheaper.</p>
    `
  }
];

export const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
        setPosts(STATIC_POSTS);
        setLoading(false);
    }, 400);
  }, []);

  // --- SEO HELPERS ---
  const generateListSchema = () => JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": posts.map((post, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": `https://safespoon.com/blog/${post.id}`,
          "name": post.title
      }))
  });

  const generateArticleSchema = (post) => JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "image": [post.image],
      "datePublished": new Date(post.date).toISOString(),
      "author": [{ "@type": "Person", "name": post.author }],
      "publisher": { "@type": "Organization", "name": "Safespoon" }
  });

  // --- ARTICLE READING VIEW ---
  if (selectedPost) {
      return (
        <AnimatePresence>
            <motion.article 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 20 }}
                className="w-full pb-32 font-['Switzer'] bg-gray-50 min-h-screen z-50 fixed inset-0 overflow-y-auto"
            >
                {/* SEO for Article */}
                <Helmet>
                    <title>{selectedPost.title} | Safespoon Insights</title>
                    <meta name="description" content={selectedPost.excerpt} />
                    <script type="application/ld+json">{generateArticleSchema(selectedPost)}</script>
                </Helmet>
                
                {/* Navbar */}
                <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 h-[60px] flex items-center justify-between">
                    <button 
                        onClick={() => setSelectedPost(null)} 
                        className="flex items-center gap-1 text-emerald-600 font-bold active:opacity-50 transition-opacity"
                    >
                        <ArrowLeft />
                        <span className="text-sm uppercase tracking-widest">Back</span>
                    </button>
                    <button className="text-emerald-600 active:opacity-50 transition-opacity">
                        <ShareIcon />
                    </button>
                </div>

                <div className="bg-white min-h-screen">
                    {/* Hero Image */}
                    <div className="w-full aspect-video bg-slate-100 mb-8 overflow-hidden">
                        <img src={selectedPost.image} alt={selectedPost.title} className="w-full h-full object-cover" />
                    </div>

                    {/* Article Content */}
                    <div className="px-6 md:px-8 max-w-2xl mx-auto pb-24">
                        {/* Meta */}
                        <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{selectedPost.category}</span>
                            <span>{selectedPost.date}</span>
                        </div>
                        
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-6 tracking-tight">
                            {selectedPost.title}
                        </h1>

                        <div className="flex items-center gap-3 border-b border-slate-50 pb-8 mb-8">
                            <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden border border-white shadow-sm ring-1 ring-slate-100">
                                <img src={`https://ui-avatars.com/api/?name=Quajaee+Simmons&background=10b981&color=fff`} alt="Author" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 leading-tight">{selectedPost.author}</p>
                                <p className="text-[10px] text-slate-400 font-bold tracking-tight capitalize">{selectedPost.readTime} Read</p>
                            </div>
                        </div>

                        {/* Prose Body */}
                        <div 
                            className="prose prose-lg prose-slate max-w-none 
                            prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900 
                            prose-p:text-slate-600 prose-p:leading-loose prose-p:font-medium prose-p:text-base
                            prose-a:text-emerald-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                            prose-strong:text-slate-900 prose-strong:font-black"
                        >
                            <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
                        </div>
                    </div>
                </div>
            </motion.article>
        </AnimatePresence>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="w-full pb-32 font-['Switzer'] bg-gray-50 min-h-screen text-slate-900">
      <Helmet>
        <title>Safespoon Insights | Food Safety & Allergy Tips</title>
        <meta name="description" content="Expert guides on dining out safely, understanding cross-contact, and managing food allergies." />
        <script type="application/ld+json">{generateListSchema()}</script>
      </Helmet>

      {/* Header - MATCHING DASHBOARD.JSX STYLE */}
      <div className="pt-10 pb-4 px-4">
         <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">
                Community<br/>
                <span className="text-emerald-600">Insights</span>
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                Food Safety & Allergy Tips
            </p>
         </div>
      </div>

      {/* Feed - MATCHING DASHBOARD CARD STYLE */}
      <div className="px-4 space-y-4">
        {loading ? (
            <div className="space-y-4">
               {[1,2,3].map(i => <div key={i} className="h-64 bg-white animate-pulse rounded-[1.5rem] border border-slate-50"></div>)}
            </div>
        ) : (
            posts.map((post) => (
                <article 
                    key={post.id}
                    className="bg-white rounded-[1.5rem] p-3 shadow-sm border border-slate-50 active:scale-[0.98] transition-all cursor-pointer group" 
                    onClick={() => setSelectedPost(post)}
                >
                    {/* Image Container - Rounded corners to match inner padding */}
                    <div className="h-48 w-full relative bg-slate-100 rounded-2xl overflow-hidden mb-4">
                        <img 
                            src={post.image} 
                            alt={post.title} 
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
                        />
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-600 shadow-sm border border-white/20">
                            {post.category}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-2 pb-2">
                        <h2 className="text-lg font-black text-slate-900 leading-tight mb-2 line-clamp-2">
                            {post.title}
                        </h2>
                        <p className="text-xs text-slate-400 font-bold line-clamp-2 leading-relaxed mb-4">
                            {post.excerpt}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-slate-200 overflow-hidden">
                                     <img src={`https://ui-avatars.com/api/?name=Quajaee+Simmons&background=10b981&color=fff`} alt="" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{post.readTime}</span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 capitalize tracking-tight group-hover:translate-x-1 transition-transform">Read</span>
                        </div>
                    </div>
                </article>
            ))
        )}
      </div>
    </div>
  );
};
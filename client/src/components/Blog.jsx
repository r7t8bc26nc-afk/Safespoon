import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from "firebase/firestore";

// --- STATIC BLOG DATA ---
const STATIC_POSTS = [
  {
    id: 'navigating-dining-out',
    title: "Navigating Dining Out with Food Allergies: A Survival Guide",
    category: "Safety Tips",
    author: "Quajaee Simmons",
    date: "Jan 18, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
    excerpt: "Don't let food allergies keep you at home. Learn the essential questions to ask servers, how to read allergen menus, and red flags to watch for.",
    content: `<p>For the 32 million Americans with food allergies, the simple question "Where should we eat?" can often induce panic rather than excitement. But having dietary restrictions shouldn't mean missing out on social experiences or the joy of a restaurant meal. The key is shifting from spontaneity to strategy.</p><p>The first line of defense is research. Before you even leave the house, check the restaurant's online presence. Most reputable chains now publish detailed allergen matrices that are far more reliable than a third-party blog post. However, an online menu is just a starting point. Use tools like the Safespoon Explorer to see verified reviews from others with your specific restrictions, as protocols can vary wildy by location.</p><h2>The "Chef Card" is Your Best Friend</h2><p>If you don't already carry one, print a "Chef Card." This is a small card that lists your specific allergies and the severity of the reaction. Handing this to your server removes the dangerous game of "telephone" between the front of house and the kitchen. It signals that your request is a medical necessity, not a lifestyle preference, and often prompts the manager to oversee your order personally.</p>`
  },
  {
    id: 'understanding-cross-contact',
    title: "The Hidden Danger: Understanding Cross-Contact in Kitchens",
    category: "Health",
    author: "Quajaee Simmons",
    date: "Jan 05, 2026",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&w=1200&q=80",
    excerpt: "Ordering a 'gluten-free' dish isn't enough if it's prepared on the same surface as regular bread. Learn the mechanics of cross-contact.",
    content: `<p>You ordered the gluten-free pizza. The crust is certified gluten-free. But were the toppings grabbed from a bin full of crumbs? This is the reality of <strong>Cross-Contact</strong>.</p>`
  },
  {
    id: 'top-allergy-chains',
    title: "5 Fast-Casual Chains That Take Allergies Seriously",
    category: "Reviews",
    author: "Quajaee Simmons",
    date: "Dec 20, 2025",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1554679665-f5537f187268?auto=format&fit=crop&w=1200&q=80",
    excerpt: "We ranked the top fast-casual spots based on allergen transparency and safety protocols. See why Chipotle and Sweetgreen made the list.",
    content: `<p>Fast food used to be a "no-go" zone for the allergy-conscious. Fortunately, the rise of "fast-casual" dining has brought transparency to the forefront.</p>`
  },
  {
    id: 'how-safespoon-works',
    title: "Verified vs. Friendly: How Safespoon Rates Restaurants",
    category: "Safety Tips",
    author: "Quajaee Simmons",
    date: "Dec 02, 2025",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1200&q=80",
    excerpt: "What makes a restaurant 'Verified Safe'? Inside the rigorous scoring system Safespoon uses to keep you safe.",
    content: `<p>You’ve seen the badges on our dashboard: "High Rating," "Verified Safe," and "User Recommended." But what do they actually mean?</p>`
  },
  {
    id: 'budget-allergy-eating',
    title: "Eating Well on a Budget: Managing Allergies",
    category: "Shopping",
    author: "Quajaee Simmons",
    date: "Nov 15, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    excerpt: "Gluten-free bread costs twice as much. Dairy-free cheese is a luxury. Here are practical tips for handling dietary restrictions on a budget.",
    content: `<p>It's often called the "Allergy Tax"—the phenomenon where safe versions of staple foods cost 200% more than their standard counterparts.</p>`
  }
];

// --- MOCK AD COMPONENT ---
const MockAd = () => (
  <div className="w-full py-10 my-8">
     {/* Ad Label */}
     <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sponsored Content</span>
        <div className="h-px bg-gray-100 flex-1"></div>
     </div>

     {/* Ad Card (Fixed mobile height for full visibility) */}
     <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 to-fuchsia-900 text-white shadow-xl shadow-gray-200 group cursor-pointer h-auto min-h-[300px] md:h-[220px]">
        {/* Decorative Blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 gap-6 h-full">
           <div className="flex-1 text-center md:text-left z-20">
               <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                   <div className="inline-block bg-white/20 backdrop-blur-sm border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white">
                       Partner
                   </div>
               </div>

               <h2 className="text-2xl font-extrabold mb-2 tracking-tight">Thrive Market</h2>
               <p className="text-gray-100 mb-6 max-w-sm mx-auto md:mx-0 text-sm opacity-90">
                   Get <span className="text-white font-bold text-base">30% OFF</span> your first verified allergen-safe order.
               </p>
               
               <button className="bg-white text-violet-900 px-6 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-all shadow-lg active:scale-95">
                   Shop Now
               </button>
           </div>
           
           <div className="relative w-full md:w-48 h-32 md:h-full shrink-0 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 transform md:rotate-3 group-hover:rotate-0 transition-transform duration-500">
               <img 
                 src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80" 
                 alt="Thrive Market" 
                 className="object-cover w-full h-full"
               />
           </div>
        </div>
     </div>
  </div>
);

export const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
        setPosts(STATIC_POSTS);
        setLoading(false);
    }, 500);
  }, []);

  const categories = ['All', 'Safety Tips', 'Reviews', 'Nutrition', 'Shopping', 'Health'];
  const filteredPosts = activeCategory === 'All' ? posts : posts.filter(p => p.category === activeCategory);

  // --- ARTICLE READING VIEW ---
  if (selectedPost) {
      return (
        // ✅ FIXED: pb-5 (20px) to stop scrolling immediately after content
        <div className="w-full max-w-3xl mx-auto pb-5 animate-fade-in px-5 md:px-0">
            
            {/* Minimal Nav */}
            <button onClick={() => setSelectedPost(null)} className="mb-6 flex items-center gap-2 text-gray-400 font-bold hover:text-gray-900 transition-colors text-sm uppercase tracking-wide group pt-6">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Blog
            </button>

            {/* Header */}
            <header className="mb-6 text-left">
                <div className="flex items-center gap-3 text-xs font-bold text-violet-600 uppercase tracking-wider mb-3">
                    <span className="px-2 py-1 bg-violet-50 rounded-md">{selectedPost.category}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-500">{selectedPost.date}</span>
                </div>
                
                {/* ✅ FIXED: Larger Title (text-4xl md:text-6xl) */}
                <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-none mb-6 tracking-tight">
                    {selectedPost.title}
                </h1>

                {/* ✅ FIXED: Downsized Author Section */}
                <div className="flex items-center gap-3 border-b border-gray-100 pb-6">
                    <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden border border-white shadow-sm">
                         <img src={`https://ui-avatars.com/api/?name=Quajaee+Simmons&background=random&color=fff&background=7c3aed`} alt="Author" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-900">{selectedPost.author}</p>
                    </div>
                </div>
            </header>

            {/* Feature Image */}
            <div className="w-full h-64 md:h-[450px] bg-gray-100 mb-10 rounded-2xl overflow-hidden shadow-sm">
                <img src={selectedPost.image} alt={selectedPost.title} className="w-full h-full object-cover" />
            </div>

            {/* Article Body */}
            <article className="prose prose-lg prose-gray max-w-none font-serif leading-loose text-gray-700">
                <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
            </article>

            {/* In-Article Ad */}
            <MockAd />
        </div>
      );
  }

  // --- LIST VIEW ---
  return (
    // ✅ FIXED: pb-5 (20px) to stop scrolling immediately after content
    <div className="w-full max-w-3xl mx-auto pb-5">
      
      {/* ✅ FIXED: Heading changed to "Blog." */}
      <div className="pt-2 pb-4 border-b border-gray-100 mb-6">
        <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight mb-6">
          Articles & Blog
        </h1>
        
        {/* Categories - Scrolling Pills */}
        <div className="flex overflow-x-auto gap-2 pb-2 hide-scroll snap-x">
            {categories.map(cat => (
                <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`
                        snap-start flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 border whitespace-nowrap
                        ${activeCategory === cat 
                            ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:bg-violet-50'
                        }
                    `}
                >
                    {cat}
                </button>
            ))}
        </div>
      </div>

      {loading ? (
          <div className="space-y-24">
             {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-50 animate-pulse rounded-xl"></div>)}
          </div>
      ) : (
          <div className="space-y-20">
              {filteredPosts.map((post, index) => (
                  <React.Fragment key={post.id}>
                    {/* Insert Premium Ad after the 2nd post */}
                    {index === 2 && <MockAd />}

                    <article 
                        className="group cursor-pointer block" 
                        onClick={() => setSelectedPost(post)}
                    >
                        {/* Meta Top */}
                        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                            <span className="text-violet-600">{post.category}</span>
                            <span>•</span>
                            <span>{post.date}</span>
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-[1.1] mb-4 group-hover:text-violet-700 transition-colors">
                            {post.title}
                        </h2>

                        {/* Image */}
                        <div className="w-full h-[280px] md:h-[380px] bg-gray-100 mb-6 rounded-2xl overflow-hidden relative shadow-sm">
                            <img 
                                src={post.image} 
                                alt={post.title} 
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out" 
                            />
                        </div>

                        {/* Excerpt */}
                        <p className="text-lg text-gray-500 font-serif leading-relaxed mb-4 line-clamp-3">
                            {post.excerpt}
                        </p>

                        {/* Footer - Author & CTA */}
                        <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-6">
                            <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-gray-200 overflow-hidden border border-white shadow-sm">
                                    <img src={`https://ui-avatars.com/api/?name=Quajaee+Simmons&background=random&color=fff&background=7c3aed`} alt="" />
                                </div>
                                <span className="text-xs font-bold text-gray-900 tracking-wide">{post.author}</span>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-violet-600 group-hover:translate-x-1 transition-transform">
                                Read Story →
                            </span>
                        </div>
                    </article>
                  </React.Fragment>
              ))}
          </div>
      )}
    </div>
  );
};
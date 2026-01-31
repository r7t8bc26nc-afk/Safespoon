import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from "firebase/firestore";
import { Helmet } from "react-helmet";

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
  <div className="w-full py-6 my-8 col-span-full">
     {/* Ad Label */}
     <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sponsored Content</span>
        <div className="h-px bg-gray-100 flex-1"></div>
     </div>

     {/* Ad Card */}
     <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-900 to-fuchsia-900 text-white shadow-xl shadow-gray-200 group cursor-pointer h-auto min-h-[220px]">
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
           
           <div className="relative w-full md:w-48 h-32 md:h-full shrink-0 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 transform md:rotate-3 group-hover:rotate-0 transition-transform duration-500">
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

  useEffect(() => {
    setLoading(true);
    // Simulate fetching data
    setTimeout(() => {
        setPosts(STATIC_POSTS);
        setLoading(false);
    }, 500);
  }, []);

  // --- SEO HELPERS (JSON-LD) ---
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
      "author": [{
          "@type": "Person",
          "name": post.author
      }]
  });

  // --- ARTICLE READING VIEW ---
  if (selectedPost) {
      return (
        <article className="w-full pb-24 animate-fade-in font-['Switzer']">
            {/* SEO for Article */}
            <Helmet>
                <title>{selectedPost.title} | Safespoon Blog</title>
                <meta name="description" content={selectedPost.excerpt} />
                <script type="application/ld+json">{generateArticleSchema(selectedPost)}</script>
            </Helmet>
            
            {/* Minimal Nav */}
            <button onClick={() => setSelectedPost(null)} className="mb-6 flex items-center gap-2 text-gray-400 font-bold hover:text-gray-900 transition-colors text-sm uppercase tracking-wide group pt-6">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Blog
            </button>

            {/* Header */}
            <header className="mb-8 text-left">
                <div className="flex items-center gap-3 text-xs font-bold text-violet-600 uppercase tracking-wider mb-4">
                    <span className="px-2.5 py-1 bg-violet-50 rounded-md border border-violet-100">{selectedPost.category}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-500">{selectedPost.date}</span>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
                    {selectedPost.title}
                </h1>

                <div className="flex items-center gap-3 border-b border-gray-100 pb-8">
                    <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden border border-white shadow-sm">
                         <img src={`https://ui-avatars.com/api/?name=Quajaee+Simmons&background=random&color=fff&background=7c3aed`} alt="Author" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">{selectedPost.author}</p>
                        <p className="text-xs text-gray-400 font-medium">{selectedPost.readTime}</p>
                    </div>
                </div>
            </header>

            {/* Feature Image */}
            <div className="w-full h-64 md:h-[450px] bg-gray-100 mb-10 rounded-[2rem] overflow-hidden shadow-sm">
                <img src={selectedPost.image} alt={selectedPost.title} className="w-full h-full object-cover" />
            </div>

            {/* Article Body */}
            <div className="prose prose-lg prose-gray max-w-none font-serif leading-loose text-gray-700">
                <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
            </div>

            {/* In-Article Ad */}
            <MockAd />
        </article>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="w-full space-y-6 pb-24 font-['Switzer']">
      {/* SEO for List */}
      <Helmet>
        <title>Safespoon Blog | Allergy Tips & Reviews</title>
        <meta name="description" content="Read the latest articles on navigating dining out with food allergies, restaurant reviews, and safety tips." />
        <script type="application/ld+json">{generateListSchema()}</script>
      </Helmet>
      
      {/* Heading - HEADER REMOVED PER REQUEST */}
      {/* Category Buttons Removed Per Request */}

      {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
             {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-50 animate-pulse rounded-[2rem]"></div>)}
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
              {posts.map((post, index) => (
                  <React.Fragment key={post.id}>
                    {/* Insert Premium Ad after the 2nd post */}
                    {index === 2 && <MockAd />}

                    <article 
                        className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full" 
                        onClick={() => setSelectedPost(post)}
                    >
                        {/* Image - 16:9 Aspect Ratio to match visual standard */}
                        <div className="h-48 w-full relative bg-gray-50 shrink-0">
                            <img 
                                src={post.image} 
                                alt={post.title} 
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out" 
                            />
                        </div>

                        {/* Content Container */}
                        <div className="p-5 flex flex-col flex-grow">
                            {/* Meta */}
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-medium capitalize tracking-tight text-violet-600">
                                <span className="bg-violet-50 px-2 py-1 rounded border border-violet-100">{post.category}</span>
                                <span className="text-gray-400">• {post.readTime}</span>
                            </div>

                            {/* Title - Large Text */}
                            <h2 className="text-2xl font-bold text-gray-900 leading-tight group-hover:text-violet-700 transition-colors line-clamp-2 mb-2">
                                {post.title}
                            </h2>

                            {/* Excerpt */}
                            <p className="text-xs text-gray-500 font-medium line-clamp-2 leading-relaxed mb-4">
                                {post.excerpt}
                            </p>

                            {/* Footer - Author & CTA */}
                            <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-auto">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden border border-white shadow-sm">
                                        <img src={`https://ui-avatars.com/api/?name=Quajaee+Simmons&background=random&color=fff&background=7c3aed`} alt="" />
                                    </div>
                                    <span className="text-[10px] font-regular text-gray-900 tracking-wide">{post.author}</span>
                                </div>
                                <span className="text-[10px] font-medium capitalize tracking-tight text-violet-600 group-hover:translate-x-1 transition-transform">
                                    Read →
                                </span>
                            </div>
                        </div>
                    </article>
                  </React.Fragment>
              ))}
          </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from "firebase/firestore";

// --- STATIC BLOG DATA (Expanded Content) ---
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
    content: `
      <p>For the 32 million Americans with food allergies, the simple question "Where should we eat?" can often induce panic rather than excitement. But having dietary restrictions shouldn't mean missing out on social experiences or the joy of a restaurant meal. The key is shifting from spontaneity to strategy.</p>
      
      <p>The first line of defense is research. Before you even leave the house, check the restaurant's online presence. Most reputable chains now publish detailed allergen matrices that are far more reliable than a third-party blog post. However, an online menu is just a starting point. Use tools like the Safespoon Explorer to see verified reviews from others with your specific restrictions, as protocols can vary wildy by location.</p>

      <h2>The "Chef Card" is Your Best Friend</h2>
      <p>If you don't already carry one, print a "Chef Card." This is a small card that lists your specific allergies and the severity of the reaction. Handing this to your server removes the dangerous game of "telephone" between the front of house and the kitchen. It signals that your request is a medical necessity, not a lifestyle preference, and often prompts the manager to oversee your order personally.</p>

      <h2>Learn to Spot Red Flags</h2>
      <p>When you sit down, observe your surroundings. Does the staff seem rushed? Did the server roll their eyes when you mentioned gluten? These are immediate red flags. Additionally, be wary of buffets (high cross-contamination risk) and pre-mixed sauces, which are notorious for hiding soy, wheat, or nuts. If the staff cannot confidently answer your questions, it is safer to order a drink and eat elsewhere.</p>
    `
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
    content: `
      <p>You ordered the gluten-free pizza. The crust is certified gluten-free. But were the toppings grabbed from a bin full of crumbs? This is the reality of <strong>Cross-Contact</strong> (often called cross-contamination), and it is the most common reason for allergic reactions in restaurants. Unlike food spoilage, cooking does not remove the allergen. A crumb of walnut is enough to trigger anaphylaxis in sensitive individuals.</p>

      <h2>High-Risk Zones in Kitchens</h2>
      <p>At Safespoon, we verify restaurants based on their kitchen protocols because "friendly" isn't always "safe." Common danger zones include the fryer—if french fries are cooked in the same oil as breaded chicken, those fries are not gluten-free. Similarly, grills are high-risk; a burger patty might be safe, but if it's seared where a brioche bun was just toasted, it's contaminated.</p>
      
      <p>When dining out, don't just ask "Is this dairy-free?" Instead, ask specific process questions: "Do you use a separate cutting board for dairy-free prep?" or "Is there a dedicated fryer for non-breaded items?" Knowledge is power, and understanding how kitchens operate allows you to make safer choices and advocate for your health effectively.</p>
    `
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
    content: `
      <p>Fast food used to be a "no-go" zone for the allergy-conscious. Fortunately, the rise of "fast-casual" dining has brought transparency to the forefront. These kitchens are often open, allowing you to watch your food being prepared, which provides an extra layer of security. Based on our Safespoon Verified data, several chains are setting the standard.</p>

      <h2>Chipotle & Sweetgreen</h2>
      <p>Chipotle remains a favorite for its simplicity. With the exception of the flour tortillas, almost everything on the line is gluten-free. Their "glove change" protocol is standard when an allergy is mentioned—staff will wash hands and change gloves immediately. Similarly, Sweetgreen lists every ingredient in their dressings online. Their open-kitchen format allows you to watch your salad being made, ensuring no stray croutons make their way into your bowl.</p>
      
      <p>In-N-Out Burger is another gold standard. If you verify a "gluten allergy" at the register, they trigger a specific button on the POS. The kitchen staff changes gloves, wipes down a dedicated grill space, and prepares your "Protein Style" burger in a separate area. These standardized protocols reduce the reliance on individual server memory, making the experience consistently safer.</p>
    `
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
    content: `
      <p>You’ve seen the badges on our dashboard: "High Rating," "Verified Safe," and "User Recommended." But what do they actually mean? At Safespoon, we don't just aggregate Yelp reviews. We analyze safety protocols to ensure you aren't playing Russian Roulette with your dinner.</p>

      <h2>The "Verified Safe" Badge</h2>
      <p>This is our highest honor. For a location to earn this, they must publish a comprehensive allergen matrix and undergo a staff training audit regarding cross-contamination. We specifically look for dedicated equipment (e.g., a separate fryer or prep area) for common allergens. Without these physical barriers, a kitchen can rarely guarantee safety.</p>

      <p>Our proprietary algorithm also combines user reports with official health inspection data. We look for keywords in reviews like "reaction," "sick," or "safe." A restaurant with 5-star food but 1-star safety will never appear in your recommended feed. While we use data, our community is our heartbeat. When you tag a restaurant as "Celiac Safe" in the app, you help thousands of others make safe decisions.</p>
    `
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
    content: `
      <p>It's often called the "Allergy Tax"—the phenomenon where safe versions of staple foods cost 200% more than their standard counterparts. A loaf of gluten-free bread can cost upwards of $7, and dairy-free cheese is often considered a luxury item. However, eating safely doesn't have to drain your savings if you change your strategy.</p>

      <h2>Focus on Naturally Free Foods</h2>
      <p>Instead of buying expensive gluten-free pasta or processed substitutes, opt for naturally gluten-free carbohydrates like rice, potatoes, or corn, which cost pennies on the dollar. Whole foods are almost always cheaper and safer than processed "free-from" alternatives. Building your diet around produce, meats, and simple grains naturally avoids the markup of specialty items.</p>

      <p>Batch cooking is another essential tool. Use the Safespoon Recipes tab to find meals that scale well. A large batch of allergen-free chili or curry costs very little per serving and freezes beautifully for those nights when you're too tired to cook. Avoiding last-minute takeout orders is the single best way to protect both your health and your wallet.</p>
    `
  }
];

// --- MOCK AD COMPONENT (Premium Style) ---
const MockAd = () => (
  <div className="w-full py-10 my-8">
     {/* Ad Label */}
     <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sponsored Content</span>
        <div className="h-px bg-gray-100 flex-1"></div>
     </div>

     {/* Ad Card */}
     <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 to-fuchsia-900 text-white shadow-xl shadow-gray-200 group cursor-pointer h-[260px] md:h-[220px]">
        {/* Decorative Blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 gap-6 h-full">
           <div className="flex-1 text-center md:text-left z-20">
               {/* Badge & Title */}
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
           
           {/* Ad Image */}
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
        <div className="w-full max-w-3xl mx-auto pb-32 animate-fade-in px-4 md:px-0">
            {/* Minimal Nav */}
            <button onClick={() => setSelectedPost(null)} className="mb-12 flex items-center gap-2 text-gray-400 font-bold hover:text-gray-900 transition-colors text-sm uppercase tracking-wide group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Feed
            </button>

            {/* Article Header */}
            <header className="mb-10 text-center md:text-left">
                <div className="flex items-center gap-3 text-xs font-bold text-violet-600 uppercase tracking-wider mb-4 justify-center md:justify-start">
                    <span className="px-2 py-1 bg-violet-50 rounded-md">{selectedPost.category}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-500">{selectedPost.date}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-[1.1] mb-8 tracking-tight">
                    {selectedPost.title}
                </h1>
                <div className="flex items-center gap-4 justify-center md:justify-start border-b border-gray-100 pb-8">
                    <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
                         <img src={`https://ui-avatars.com/api/?name=Quajaee+Simmons&background=random&color=fff&background=7c3aed`} alt="Author" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">{selectedPost.author}</p>
                        {/* Subtitle removed per request */}
                    </div>
                </div>
            </header>

            {/* Feature Image */}
            <div className="w-full h-[350px] md:h-[450px] bg-gray-100 mb-12 rounded-2xl overflow-hidden shadow-sm">
                <img src={selectedPost.image} alt={selectedPost.title} className="w-full h-full object-cover" />
            </div>

            {/* Article Body */}
            <article className="prose prose-lg prose-gray max-w-none font-serif leading-loose text-gray-700">
                <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
            </article>

            {/* In-Article Ad */}
            <MockAd />

            {/* Read Next Section */}
            <div className="mt-16 pt-10 border-t border-gray-100">
                <h3 className="text-xl font-bold mb-8">Read Next</h3>
                <div className="grid md:grid-cols-2 gap-8">
                    {posts.filter(p => p.id !== selectedPost.id).slice(0, 2).map(p => (
                        <div key={p.id} onClick={() => setSelectedPost(p)} className="cursor-pointer group">
                             <div className="h-48 bg-gray-100 mb-4 rounded-xl overflow-hidden shadow-sm">
                                <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt=""/>
                             </div>
                             <h4 className="font-bold text-lg leading-tight group-hover:text-violet-600 transition-colors">{p.title}</h4>
                             <p className="text-sm text-gray-400 mt-2">{p.readTime}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="w-full max-w-3xl mx-auto pb-24">
      
      {/* Blog Header - Reduced heading size */}
      <div className="pt-8 pb-10 border-b border-gray-100 mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-6">
          The Feed.
        </h1>
        {/* Categories */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-gray-400">
            {categories.map(cat => (
                <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`hover:text-gray-900 transition-colors ${activeCategory === cat ? 'text-gray-900 underline decoration-2 underline-offset-4 decoration-violet-500' : ''}`}
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
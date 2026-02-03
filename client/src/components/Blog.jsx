import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from 'framer-motion';
// Firebase Imports
import { db, auth } from '../firebase'; 
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  limit 
} from 'firebase/firestore';

// --- IMPORTED ICONS ---
import cameraIcon from '../icons/image-plus.svg'; // Using your specific camera icon

// --- HELPER: COLORED ICON ---
const ColoredIcon = ({ src, colorClass = "bg-slate-900", sizeClass = "w-5 h-5" }) => (
  <div 
    className={`${sizeClass} ${colorClass}`}
    style={{
      WebkitMaskImage: `url("${src}")`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskImage: `url("${src}")`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
    }}
  />
);

// --- UI ICONS (Standard Utility) ---
const UiIcons = {
  Heart: ({ filled }) => <svg className={`w-5 h-5 ${filled ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  Message: () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  Share: () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>,
  Trophy: () => <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3M3.343 7.05l.707.707M6 12a6 6 0 019.33-4.858 6.002 6.002 0 011.602 1.602A6 6 0 0118 12a6 6 0 01-6 6 6 6 0 01-6-6z" /></svg>,
  X: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
};

// --- COMPONENT: GOAL STATUS BAR (Read-Only) ---
const GoalStatusBar = () => {
  const [celebrations, setCelebrations] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "celebrations"), orderBy("createdAt", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCelebrations(data);
    });
    return () => unsubscribe();
  }, []);

  if (celebrations.length === 0) return null;

  return (
    <div className="pt-2 pb-4 overflow-x-auto no-scrollbar">
      <div className="flex gap-4 px-4">
        {celebrations.map((goal) => (
          <div key={goal.id} className="flex flex-col items-center gap-2 flex-shrink-0 animate-in fade-in zoom-in duration-300">
             <div className={`w-16 h-16 rounded-full p-1 border-2 border-emerald-500`}>
                <div className={`w-full h-full rounded-full ${goal.color || "bg-emerald-100 text-emerald-600"} flex items-center justify-center border-2 border-white`}>
                   <UiIcons.Trophy />
                </div>
             </div>
             <div className="text-center max-w-[80px]">
                <p className="text-xs font-bold text-slate-900 leading-tight mb-0.5">{goal.userName}</p>
                <p className="text-[10px] text-slate-500 font-medium leading-tight line-clamp-2">{goal.action}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENT: SIMPLE COMPOSER ---
const Composer = () => {
    const [text, setText] = useState("");
    const [image, setImage] = useState(null); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const user = auth.currentUser;

    // Handle Image Selection
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCancel = () => {
        setText("");
        setImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handlePost = async () => {
        if (!user) {
            alert("Please log in to post.");
            return;
        }
        if (!text.trim() && !image) return;

        setIsSubmitting(true);
        try {
            const postData = {
                authorId: user.uid,
                authorName: user.displayName || "Safespoon User",
                authorAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || "User"}&background=10b981&color=fff`,
                content: text,
                image: image, 
                createdAt: serverTimestamp(),
                type: "social",
                likes: [],
                comments: 0
            };

            await addDoc(collection(db, "posts"), postData);
            handleCancel(); // Clear form after success

        } catch (error) {
            console.error("Error posting:", error);
            alert("Failed to post. Check your connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasContent = text.length > 0 || image !== null;

    return (
        <div className="mx-4 mb-6 bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-50 transition-all">
            {/* Header Input */}
            <div className="flex gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                           {user?.displayName ? user.displayName[0] : "U"}
                        </div>
                    )}
                </div>
                <div className="flex-1 pt-2">
                    <textarea 
                        placeholder="What's on your mind?"
                        className="w-full bg-transparent font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none resize-none min-h-[40px]"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={text.length > 50 ? 3 : 1}
                    />
                </div>
            </div>

            {/* Image Preview */}
            <AnimatePresence>
                {image && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 relative rounded-xl overflow-hidden group"
                    >
                        <img src={image} alt="Preview" className="w-full max-h-60 object-cover" />
                        <button 
                            onClick={() => { setImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                            className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full backdrop-blur-sm"
                        >
                            <UiIcons.X />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                
                {/* Image Upload Button (With Text) */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 p-2 px-3 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors group"
                    >
                        <ColoredIcon src={cameraIcon} colorClass="bg-slate-400 group-hover:bg-emerald-600" sizeClass="w-5 h-5" />
                        <span className="text-sm font-medium text-slate-500 group-hover:text-emerald-700">Upload</span>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageSelect} 
                        accept="image/*" 
                        className="hidden" 
                    />
                </div>

                <div className="flex items-center gap-2">
                    {/* Cancel Button (Shows only when typing) */}
                    <AnimatePresence>
                        {hasContent && (
                            <motion.button 
                                initial={{ opacity: 0, x: 10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: 10 }}
                                onClick={handleCancel}
                                className="text-xs font-semibold text-slate-400 capitalize tracking-tight hover:text-rose-500 px-3"
                            >
                                Cancel
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Post Button */}
                    <button 
                        disabled={!hasContent || isSubmitting}
                        onClick={handlePost}
                        className="bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-bold disabled:opacity-50 transition-all active:scale-95"
                    >
                        {isSubmitting ? "Posting..." : "Post"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: POST CARD ---
const PostCard = ({ post }) => {
    const user = auth.currentUser;
    const isLiked = post.likes?.includes(user?.uid);
    const likeCount = post.likes?.length || 0;

    const toggleLike = async () => {
        if (!user) return;
        const postRef = doc(db, "posts", post.id);
        try {
            if (isLiked) {
                await updateDoc(postRef, { likes: arrayRemove(user.uid) });
            } else {
                await updateDoc(postRef, { likes: arrayUnion(user.uid) });
            }
        } catch (err) {
            console.error("Error liking post:", err);
        }
    };

    const getTimeAgo = (timestamp) => {
        if (!timestamp) return "Just now";
        const date = timestamp.toDate();
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return "Just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-50 mb-4 mx-4 transition-all hover:shadow-md">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden">
                        <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">{post.authorName}</h4>
                        <span className="text-xs font-medium text-slate-400">{getTimeAgo(post.createdAt)}</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            {post.content && (
                <p className="text-sm text-slate-700 font-medium leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>
            )}

            {/* Image Attachment (Universal for all post types) */}
            {post.image && (
                 <div className="mb-3 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                    <img src={post.image} alt="Post Attachment" className="w-full h-auto object-cover" />
                 </div>
            )}

            {/* Interaction */}
            <div className="flex items-center gap-6 pt-3 border-t border-slate-50">
                <button onClick={toggleLike} className="flex items-center gap-1.5 text-xs font-bold transition-colors text-slate-400 hover:text-rose-500">
                    <UiIcons.Heart filled={isLiked} /> <span className={isLiked ? "text-rose-500" : ""}>{likeCount}</span>
                </button>
                <button className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-emerald-500">
                    <UiIcons.Message /> {post.comments || 0}
                </button>
                <button className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 ml-auto">
                    <UiIcons.Share />
                </button>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
export const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        if(user) {
             const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20));
             const unsubscribePosts = onSnapshot(q, (snapshot) => {
                setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
             }, (error) => {
                 console.error("Auth/Firestore Error:", error);
                 setLoading(false);
             });
             return () => unsubscribePosts();
        } else {
            setLoading(false);
        }
    });
    return () => unsubscribeAuth();
  }, []);

  return (
    <div className="w-full pb-32 font-['Switzer'] bg-gray-50 min-h-screen">
      <Helmet><title>Safespoon Community</title></Helmet>

      {/* Header */}
      <div className="pt-safe-top pb-2 px-4 bg-gray-50 backdrop-blur-md sticky top-0 z-30 border-b border-slate-50">
         <div className="flex flex-col pt-2">
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900">
                Community Feed
            </h1>
         </div>
      </div>

      {/* Status Bar (Read-Only) */}
      <div className="bg-white border-b border-slate-50 mb-4">
         <GoalStatusBar />
      </div>

      {/* Composer */}
      <Composer />

      {/* Feed */}
      <div className="max-w-2xl mx-auto">
        {loading ? (
            <div className="space-y-4 px-4">
               {[1,2,3].map(i => <div key={i} className="h-48 bg-white animate-pulse rounded-[1.5rem] border border-slate-50 mx-4"></div>)}
            </div>
        ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
        {!loading && posts.length === 0 && <p className="text-center text-slate-400 font-bold py-10">No posts yet. Start the conversation!</p>}
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from '../firebase';
import { motion } from 'framer-motion';

// --- CONFIG ---
const USDA_API_KEY = '47ccOoSTZvhVDw3YpNh4nGCwSbLs98XOJufWOcY7';

const BarcodeScannerPage = ({ userProfile }) => {
    const navigate = useNavigate();
    const scannerRef = useRef(null);
    const [scanStatus, setScanStatus] = useState('ALIGN BARCODE');
    const [isScanning, setIsScanning] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [scannedProduct, setScannedProduct] = useState(null);
    const [portionSize, setPortionSize] = useState(1.0);
    const [errorMsg, setErrorMsg] = useState(null);

    const scanRegion = { width: 300, height: 150 };

    useEffect(() => {
        if (!isScanning || scannedProduct) return;
        const startScanner = async () => {
            try {
                if (!document.getElementById("reader")) return;
                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    { fps: 15, qrbox: scanRegion, aspectRatio: window.innerHeight / window.innerWidth, disableFlip: false },
                    (decodedText) => handleScanSuccess(decodedText, html5QrCode),
                    () => {} 
                );
            } catch (err) { setScanStatus("CAMERA ERROR"); }
        };
        const timer = setTimeout(startScanner, 100);
        return () => { clearTimeout(timer); if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(console.error); };
    }, [isScanning, scannedProduct]);

    const handleScanSuccess = async (barcode, scannerInstance) => {
        if (scannerInstance?.isScanning) { await scannerInstance.stop(); scannerInstance.clear(); }
        if (navigator.vibrate) navigator.vibrate(200);
        setIsScanning(false);
        setIsLoading(true);
        setScanStatus("SEARCHING...");

        try {
            const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${barcode}&dataType=Branded`);
            const data = await res.json();
            if (data.foods && data.foods.length > 0) {
                const food = data.foods[0];
                const detailRes = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${food.fdcId}?api_key=${USDA_API_KEY}`);
                const detailData = await detailRes.json();
                
                const rawSize = detailData.servingSize || 100;
                const multiplier = rawSize / 100;
                const getNut = (ids) => ({ amount: Math.round((detailData.foodNutrients?.find(nut => ids.includes(String(nut.nutrient.number)))?.amount || 0) * multiplier * 10) / 10 });

                setScannedProduct({
                    name: detailData.description,
                    brand: detailData.brandOwner || "Generic",
                    servingLabel: `${rawSize}${detailData.servingSizeUnit || 'g'}`,
                    coreMetrics: { calories: getNut(['208', '1008']), protein: getNut(['203']), fat: getNut(['204']), carbs: getNut(['205']) }
                });
            } else { setErrorMsg("BARCODE NOT FOUND"); }
        } catch (err) { setErrorMsg("NETWORK ERROR"); } 
        finally { setIsLoading(false); }
    };

    const handleSave = async () => {
        if (!userProfile?.uid || !scannedProduct) return;
        const base = scannedProduct.coreMetrics;
        const trackedMetrics = {}; 
        Object.keys(base).forEach(key => { trackedMetrics[key] = { amount: Math.round((base[key]?.amount || 0) * portionSize) }; });
        
        try {
            await updateDoc(doc(db, "users", userProfile.uid), { 
                dailyIntake: arrayUnion({ ...trackedMetrics, name: scannedProduct.name, brand: scannedProduct.brand, portion: Number(portionSize), meal: 'Snacks', timestamp: new Date().toISOString() }) 
            });
            navigate('/');
        } catch (e) { setErrorMsg("SAVE FAILED"); }
    };

    return (
        <div className="fixed inset-0 bg-black z-[12000] font-sans flex flex-col">
            <div className="absolute top-6 left-6 z-30">
                <button onClick={() => navigate('/')} className="w-12 h-12 bg-white border-4 border-black flex items-center justify-center text-2xl font-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:shadow-none active:translate-x-1 active:translate-y-1">×</button>
            </div>

            {/* SCANNER VIEW */}
            {isScanning && (
                <div className="absolute inset-0 w-full h-full bg-black">
                    <div id="reader" className="w-full h-full object-cover opacity-60 grayscale" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        {/* NEUBRUTALIST SCAN BOX */}
                        <div className="relative border-4 border-white bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.8)]" style={{ width: scanRegion.width, height: scanRegion.height }}>
                            <div className="absolute top-0 left-0 bg-white text-black text-xs font-black px-2 py-1">SCAN ZONE</div>
                            <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-1 bg-[#FFD700]" />
                        </div>
                    </div>
                    <div className="absolute bottom-24 left-0 right-0 text-center z-20 pointer-events-none">
                        <span className="bg-black text-white px-4 py-2 border-2 border-white font-black uppercase tracking-widest">{scanStatus}</span>
                    </div>
                </div>
            )}

            {/* LOADING */}
            {isLoading && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white border-8 border-black">
                    <div className="text-4xl font-black uppercase animate-pulse">PROCESSING...</div>
                </div>
            )}

            {/* RESULT CARD */}
            {scannedProduct && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="bg-white w-full border-t-8 border-black p-6 pb-12 relative pointer-events-auto">
                        <div className="w-20 h-2 bg-black mx-auto mb-8" />
                        
                        <div className="text-center mb-8">
                            <span className="bg-black text-white px-2 py-1 text-xs font-bold uppercase">{scannedProduct.brand}</span>
                            <h2 className="text-3xl font-black uppercase leading-none mt-2">{scannedProduct.name}</h2>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-8">
                            {['calories', 'protein', 'carbs', 'fat'].map(m => (
                                <div key={m} className="border-4 border-black p-2 flex flex-col items-center justify-center bg-[#E0E7FF]">
                                    <span className="text-[10px] font-bold uppercase mb-1">{m.slice(0,3)}</span>
                                    <span className="text-xl font-black">{Math.round((scannedProduct.coreMetrics[m]?.amount || 0) * portionSize)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between mb-8 border-4 border-black p-4 bg-white">
                            <button onClick={() => setPortionSize(p => Math.max(0.5, p - 0.5))} className="w-10 h-10 bg-black text-white font-black text-xl active:scale-90">-</button>
                            <div className="text-center">
                                <span className="block text-4xl font-black">{portionSize}<span className="text-lg text-gray-400">x</span></span>
                                <span className="text-xs font-bold uppercase">{scannedProduct.servingLabel}</span>
                            </div>
                            <button onClick={() => setPortionSize(p => p + 0.5)} className="w-10 h-10 bg-black text-white font-black text-xl active:scale-90">+</button>
                        </div>

                        <button onClick={handleSave} className="w-full py-5 bg-[#FFD700] text-black border-4 border-black font-black uppercase text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1">CONFIRM LOG</button>
                    </motion.div>
                </div>
            )}

            {/* ERROR */}
            {errorMsg && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white p-8 text-center border-8 border-black">
                    <div className="text-6xl mb-4">!</div>
                    <h3 className="text-3xl font-black uppercase mb-4">{errorMsg}</h3>
                    <button onClick={() => { setErrorMsg(null); setIsScanning(true); }} className="w-full py-4 bg-black text-white border-4 border-black font-black uppercase mb-4">RETRY</button>
                    <button onClick={() => navigate('/')} className="text-sm font-bold uppercase underline">CANCEL</button>
                </div>
            )}
        </div>
    );
};

export default BarcodeScannerPage;
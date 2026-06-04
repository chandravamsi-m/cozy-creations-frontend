import React from 'react';
import { Link } from 'react-router-dom';
import whatsapp2 from '../assets/images/whatsapp-2.webp';
import whatsapp3 from '../assets/images/whatsapp-3.webp';
import mailRounded from '../assets/svgs/mail-rounded.svg';
import call from '../assets/svgs/call.svg';
import { MapPin, Instagram } from 'lucide-react';


export default function Footer() {
    return (
        <div className="relative w-full bg-[#191816] text-white pt-4 md:pt-10 pb-8 md:pb-12 overflow-visible z-10">
            <div className="hidden lg:block overflow-visible absolute bottom-[52px] right-[2%] w-[280px] h-[400px] opacity-100 pointer-events-none">
                <img src={whatsapp2} alt="Decor" className="w-full h-[100%] object-contain" />
            </div>


            <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 relative z-10">
                <div className="flex flex-col md:flex-row gap-5 md:gap-12 lg:gap-16 xl:gap-24 items-start md:items-start justify-start">
                    <div className="flex flex-col gap-1 items-center flex-shrink-0 w-full sm:w-[300px]">
                        <div className="w-full h-auto rounded-2xl overflow-hidden relative">
                            <img
                                src={whatsapp3}
                                alt="Footer Candle"
                                className="w-full h-auto max-h-[140px] sm:max-h-[180px] md:max-h-[200px] object-contain"
                            />
                        </div>
                        {/* Social & Contact Icons */}
                        <div className="flex items-center justify-center gap-3 px-1 w-full">
                            <a
                                href="https://www.instagram.com/cozycreationscandle"
                                target="_blank"
                                rel="noreferrer"
                                className="group relative p-2 bg-white/5 rounded-full hover:bg-white transition-all duration-300 flex items-center justify-center text-white hover:text-[#191816] hover:scale-110 shadow-md"
                            >
                                <Instagram className="w-[18px] h-[18px] flex-shrink-0 transition-all duration-300 text-white group-hover:text-[#191816]" />
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-semibold text-[#191816] bg-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-xl z-20">
                                    @cozycreationscandle
                                    <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></span>
                                </span>
                            </a>
                            <a
                                href="mailto:cozycandlecorner13@gmail.com"
                                className="group relative p-2 bg-white/5 rounded-full hover:bg-white transition-all duration-300 flex items-center justify-center text-white hover:text-[#191816] hover:scale-110 shadow-md"
                            >
                                <img src={mailRounded} alt="Email" className="w-[18px] h-[18px] flex-shrink-0 transition-all duration-300 group-hover:brightness-0" />
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-semibold text-[#191816] bg-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-xl z-20">
                                    cozycandlecorner13@gmail.com
                                    <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></span>
                                </span>
                            </a>
                            <a
                                href="tel:8019401322"
                                className="group relative p-2 bg-white/5 rounded-full hover:bg-white transition-all duration-300 flex items-center justify-center text-white hover:text-[#191816] hover:scale-110 shadow-md"
                            >
                                <img src={call} alt="Call" className="w-[18px] h-[18px] flex-shrink-0 transition-all duration-300 group-hover:brightness-0" />
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-semibold text-[#191816] bg-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-xl z-20">
                                    8019401322
                                    <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></span>
                                </span>
                            </a>
                            <a
                                href="https://maps.google.com/?q=Hyderabad,+Gajularamaram"
                                target="_blank"
                                rel="noreferrer"
                                className="group relative p-2 bg-white/5 rounded-full hover:bg-white transition-all duration-300 flex items-center justify-center text-white hover:text-[#191816] hover:scale-110 shadow-md"
                            >
                                <MapPin className="w-[18px] h-[18px] flex-shrink-0 transition-all duration-300 text-white group-hover:text-[#191816]" />
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-semibold text-[#191816] bg-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-xl z-20">
                                    Hyderabad, Gajularamaram
                                    <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></span>
                                </span>
                            </a>
                        </div>
                    </div>


                    <div className="flex flex-col sm:flex-row gap-5 sm:gap-16 lg:gap-24 xl:gap-32 w-full sm:w-auto items-start pt-2 md:pt-4">
                        <div className="flex flex-col gap-3 text-base capitalize items-start">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-[-4px]">Company</h4>
                            <Link to="/" className="hover:text-yellow-accent transition-colors">Home</Link>
                            <Link to="/about" className="hover:text-yellow-accent transition-colors">About Us</Link>
                            <Link to="/products" className="hover:text-yellow-accent transition-colors">Products</Link>
                            <Link to="/contact" className="hover:text-yellow-accent transition-colors whitespace-nowrap">Contact Us</Link>
                        </div>

                        <div className="flex flex-col gap-3 text-base capitalize items-start">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-[-4px]">Policies</h4>
                            <Link to="/privacy-policy" className="hover:text-yellow-accent transition-colors">Privacy Policy</Link>
                            <Link to="/terms-and-conditions" className="hover:text-yellow-accent transition-colors">Terms & Conditions</Link>
                            <Link to="/refund-policy" className="hover:text-yellow-accent transition-colors">Refund & Cancellation</Link>
                            <Link to="/shipping-policy" className="hover:text-yellow-accent transition-colors">Shipping & Delivery</Link>
                        </div>
                    </div>

                    {/* Invisible Spacer for Lamp Alignment */}
                    <div className="hidden lg:block lg:w-[120px] xl:w-[280px] h-[1px] flex-shrink-0"></div>
                </div>

                <div className="w-full h-[1px] bg-white mt-6 mb-4 opacity-20"></div>
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-2 text-[10px] md:text-xs text-white opacity-90">
                    <div>© 2025 Cozy Creations. All rights reserved.</div>
                    <div className="hidden sm:block w-[1px] h-3 bg-white opacity-30"></div>
                    <div className="tracking-widest uppercase">GSTIN: 09CWMPG6310F1ZL</div>
                </div>
            </div>
        </div>
    );
}
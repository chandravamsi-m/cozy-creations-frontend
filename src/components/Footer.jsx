import React from 'react';
import whatsapp2 from '../assets/images/whatsapp-2.webp';
import whatsapp3 from '../assets/images/whatsapp-3.webp';
import mailRounded from '../assets/svgs/mail-rounded.svg';
import call from '../assets/svgs/call.svg';
import instagram from '../assets/svgs/instagram-fill.svg';


export default function Footer() {
    return (
        <div className="relative w-full bg-[#191816] text-white py-16 overflow-visible z-10">
            <div className="hidden lg:block overflow-visible absolute top-[-170px] right-[2%] w-[380px] h-[500px] opacity-100 pointer-events-none">
                <img src={whatsapp2} alt="Decor" className="w-full h-[100%] object-contain" />
            </div>


            <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 relative z-10">
                <div className="flex flex-col md:flex-row gap-8 md:gap-10 lg:gap-20 items-center md:items-start">
                    <div className="w-full sm:w-[300px] h-[150px] sm:h-[200px] rounded-2xl overflow-hidden relative flex-shrink-0 bg-[#191816]">
                        <img src={whatsapp3} alt="Footer Candle" className="w-full h-full object-contain" />
                    </div>


                    <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 lg:gap-20 w-full sm:w-auto">
                        <div className="flex flex-col gap-3 text-sm capitalize">
                            <a href="#" className="hover:text-yellow-accent transition-colors">Home</a>
                            <a href="#" className="hover:text-yellow-accent transition-colors">About Us</a>
                            <a href="#" className="hover:text-yellow-accent transition-colors">Products</a>
                            <a href="#" className="hover:text-yellow-accent transition-colors">Contact Us</a>
                        </div>


                        <div className="flex flex-col gap-4 text-sm">
                            <p className="flex items-center gap-2">
                                <img src={instagram} alt="Instagram" className="w-4 h-4 flex-shrink-0" />
                                <a
                                    href="https://www.instagram.com/cozycreationscandle"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline break-all hover:text-yellow-accent transition-colors"
                                >
                                    @cozycreationscandle
                                </a>
                            </p>
                            <p className="flex items-center gap-2 flex-wrap">
                                <img src={mailRounded} alt="Email" className="w-4 h-4 flex-shrink-0" />
                                <a href="mailto:cozycandlecorner13@gmail.com" className="underline break-all">cozycandlecorner13@gmail.com</a>
                            </p>
                            <p className="flex items-center gap-2">
                                <img src={call} alt="Call" className="w-4 h-4 flex-shrink-0" />
                                <span>8019401322</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <span>📍</span>
                                <span>Hyderabad, Gajularamaram</span>
                            </p>
                        </div>
                    </div>
                </div>


                <div className="w-full h-[1px] bg-white my-8"></div>


                <div className="text-center text-xs text-white">© 2026 Cozy Creations. All rights reserved.</div>
            </div>
        </div>
    );
}
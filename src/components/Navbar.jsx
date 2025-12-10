import React from 'react';
import logo from '../assets/images/logo image.png';


export default function Navbar({ stickyNavRef, menuOpen, setMenuOpen }) {
return (
<nav ref={stickyNavRef} className="fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-md shadow-lg">
<div className="relative max-w-[1280px] mx-auto px-4 py-2">
<div className="flex justify-between items-center">
<div className="h-10 w-28 relative overflow-hidden">
<img src={logo} alt="Logo" className="absolute w-[100%] h-[100%] object-contain" />
</div>


<div className="hidden md:flex gap-10 text-xs text-white uppercase">
<a href="#" className="hover:text-yellow-accent transition-colors">Home</a>
<a href="#" className="hover:text-yellow-accent transition-colors">About Us</a>
<a href="#" className="hover:text-yellow-accent transition-colors">Products</a>
<a href="#" className="hover:text-yellow-accent transition-colors">Custom</a>
</div>


<div className="flex items-center gap-3">
<button className="hidden md:inline-flex bg-yellow-accent px-4 py-2 rounded-lg text-xs text-black capitalize hover:bg-yellow-500 transition-colors">
Contact Us
</button>
<button
className="md:hidden h-10 w-10 inline-flex items-center justify-center text-white text-2xl"
onClick={() => setMenuOpen((prev) => !prev)}
aria-label="Toggle menu"
type="button"
>
☰
</button>
</div>
</div>


{/* Mobile dropdown - attached, full width */}
<div
className={`md:hidden absolute left-0 right-0 top-full w-full bg-black/80 backdrop-blur-md p-4 space-y-3 text-white text-sm shadow-lg origin-top transition-all duration-250 ease-out z-40 ${
menuOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
}`}
>
<a href="#" className="block hover:text-yellow-accent">Home</a>
<a href="#" className="block hover:text-yellow-accent">About Us</a>
<a href="#" className="block hover:text-yellow-accent">Products</a>
<a href="#" className="block hover:text-yellow-accent">Custom</a>
<button className="w-full bg-yellow-accent text-black rounded-md py-2 text-xs font-semibold hover:bg-yellow-500 transition-colors" type="button">
Contact Us
</button>
</div>
</div>
</nav>
);
}
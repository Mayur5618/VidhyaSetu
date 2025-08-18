import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full bg-white text-black text-center pt-8 pb-3 text-sm relative mt-12 shadow-md rounded-t-2xl border-t border-gray-200">
      <div className="absolute -top-6 left-0 w-full overflow-hidden leading-none pointer-events-none select-none">
        <svg viewBox="0 0 500 40" preserveAspectRatio="none" className="w-full h-8">
          <path d="M0,20 C150,60 350,0 500,20 L500,00 L0,0 Z" fill="#000" fillOpacity="0.04" />
        </svg>
      </div>
      <div className="flex items-center justify-center gap-2 mb-1">
        <span className="inline-block bg-gray-100 rounded-full p-1 shadow-sm">
          <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0 1 7-7zm0 18c-4.41 0-8 1.79-8 4v1h16v-1c0-2.21-3.59-4-8-4z"/></svg>
        </span>
        <span className="font-semibold tracking-wide px-2 py-1 rounded-lg">VidhyaSetu</span>
      </div>
      <span className="block text-black/70">© {new Date().getFullYear()} VidhyaSetu. All rights reserved.</span>
    </footer>
  );
};

export default Footer; 
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "FinTwin — Living Financial Digital Twin", template: "%s · FinTwin" },
  description: "Build a living model of your financial life, test possible scenarios, and understand the range of futures your decisions could create.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F0EFE4" },
    { media: "(prefers-color-scheme: dark)", color: "#121210" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(function(){try{
var t=localStorage.getItem('ft-theme');
if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
if(t==='dark'){document.documentElement.classList.add('dark')}
var y=localStorage.getItem('ft-yellow');
if(y){
var dk=document.documentElement.classList.contains('dark');
function px(w){var c=w.replace('#','');if(c.length===3){c=c[0]+c[0]+c[1]+c[1]+c[2]+c[2]}if(!/^[0-9a-fA-F]{6}$/.test(c)){c='f3c142'}return[parseInt(c.slice(0,2),16)/255,parseInt(c.slice(2,4),16)/255,parseInt(c.slice(4,6),16)/255]}
function hslx(w){var r=px(w)[0],g=px(w)[1],b=px(w)[2];var mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn,s=d===0?0:d/(1-Math.abs(2*l-1)),h=0;if(d!==0){if(mx===r)h=((g-b)/d+6)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60}return[h,s*100,l*100]}
var hs=hslx(y),H=hs[0],S=hs[1],L=hs[2];
function cl(h,s,l){return 'hsl('+Math.round(((h%360)+360)%360)+' '+Math.round(Math.max(0,Math.min(100,s)))+'% '+Math.round(Math.max(0,Math.min(100,l)))+'%)'}
var wh=(H+28)%360,al=dk?Math.max(L,58):Math.min(Math.max(L,28),78);
function lum(w){var c=w.replace('#','');if(c.length===3){c=c[0]+c[0]+c[1]+c[1]+c[2]+c[2]}var ch=[0,2,4].map(function(i){var v=parseInt(c.slice(i,i+2),16)/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*ch[0]+0.7152*ch[1]+0.0722*ch[2]}
var ai=lum(y)>0.42?cl(H,Math.min(72,S*0.8),13):cl(H,45,97);
var st=document.documentElement.style;
st.setProperty('--accent-base',y);
st.setProperty('--accent',cl(H,S,al));
st.setProperty('--accent-soft',dk?cl(H,Math.min(60,S*0.85),26):cl(H,S*0.9,90));
st.setProperty('--accent-ink',ai);
st.setProperty('--glow-a',dk?cl(H,Math.min(60,S),18):cl(H,S,88));
st.setProperty('--glow-b',dk?cl(H,Math.min(45,S*0.7),13):cl(H,S*0.7,94));
st.setProperty('--warn',dk?cl(wh,65,68):cl(wh,70,55));
st.setProperty('--warn-soft',dk?cl(wh,45,22):cl(wh,80,90));
st.setProperty('--yellow-color',y);
}
}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-page text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

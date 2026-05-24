import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title:       'Kahaniverse: Read. Write. Get Discovered.',
  description: 'A collaborative universe of short stories spanning Science Fiction, Fantasy, and Mythology.',
  keywords:    'short stories, science fiction, fantasy, mythology, collaborative fiction, kahaniverse',
  authors:     [{ name: 'Kahaniverse' }],
  robots:      'index, follow',
  alternates:  { canonical: 'https://kahaniverse.com/' },
  openGraph: {
    type:        'website',
    url:         'https://kahaniverse.com/',
    title:       'Kahaniverse — Read. Write. Get Discovered.',
    description: 'A collaborative universe of short stories. Science Fiction, Fantasy, Mythology.',
    images:      [{ url: 'https://kahaniverse.com/images/logo.png' }],
  },
  twitter: {
    card:        'summary_large_image',
    site:        '@kahaniverse',
    title:       'Kahaniverse — Read. Write. Get Discovered.',
    description: 'Collaborative short story universes in Sci-Fi, Fantasy, and Mythology.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type':    'WebSite',
          name:       'Kahaniverse',
          url:        'https://kahaniverse.com',
          description: 'A collaborative universe of short stories.',
          logo:        'https://kahaniverse.com/images/logo.png',
          potentialAction: {
            '@type':     'SearchAction',
            target:      'https://kahaniverse.com/discover?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        })}} />
      </head>
      <body>
        {children}

        {/* Google Analytics */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-3LK8JS27EZ" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-3LK8JS27EZ');
        `}</Script>

        {/* Facebook Pixel */}
        <Script id="fb-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
          n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
          s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','3361892873893079');fbq('track','PageView');
        `}</Script>
      </body>
    </html>
  );
}

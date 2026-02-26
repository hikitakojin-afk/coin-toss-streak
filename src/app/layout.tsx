import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title: 'Coin Toss Streak',
  description: 'Can you get the ultimate streak?',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
  other: {
    'google-adsense-account': 'ca-pub-3086915253078071' // The user's AdSense from WEB_01
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3086915253078071"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`font-sans antialiased text-white bg-black`}>
        {children}
      </body>
    </html>
  )
}

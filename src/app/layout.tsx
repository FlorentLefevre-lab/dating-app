import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Flow Dating',
  description: 'Application de rencontre sentimental moderne',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}

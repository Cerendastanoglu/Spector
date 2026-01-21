import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { WebVitals } from "./components/WebVitals";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        
        {/* Performance optimizations */}
        <link rel="preconnect" href="https://cdn.shopify.com/" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.shopify.com/" />
        
        {/* Shopify Polaris fonts (CSP compliant) */}
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        
        {/* Critical performance hints */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#ffffff" />
        
        <Meta />
        <Links />
      </head>
      <body>
        <WebVitals />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

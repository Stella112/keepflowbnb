import { PRODUCT_NAME, PRODUCT_TAGLINE } from "../lib/brand";
export default function Home() {
  return <main><header>{PRODUCT_NAME}<span>DRY RUN</span></header><p>{PRODUCT_TAGLINE}</p><h1>Stocks and portfolios you can share, own and automate.</h1><p>Discover a stock or portfolio. Own it onchain. Put it on autopilot.</p><section><h2>Discovery is being verified</h2><p>Data temporarily unavailable.</p><p>Stock discovery and purchases become available after live API verification. No transactions can be submitted from this build.</p></section></main>;
}

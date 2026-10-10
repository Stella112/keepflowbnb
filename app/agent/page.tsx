import {Navigation} from '../navigation';
import {BellReviewAgent} from './view';
export default async function AgentPage({searchParams}:{searchParams:Promise<{review?:string}>}){
 const {review}=await searchParams;
 return <main><Navigation/><section className="hero compact"><p className="eyebrow">Research and review</p><h1>Check a Flow.<br/>Keep the evidence.</h1><p className="intro">Request a private review of supported stock data and the Flow’s targets under your rules. Review jobs use sourced facts and deterministic checks.</p></section><BellReviewAgent initialReview={review}/></main>;
}

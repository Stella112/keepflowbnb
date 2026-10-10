import {publicToolClient,preparePublicBellReview} from './sellerCore.mjs';
// JSON input from stdin avoids credentials/URLs in argv. Only one bounded public review.
let bytes=0,input='';for await(const chunk of process.stdin){bytes+=chunk.length;if(bytes>1024)throw Error('INPUT_TOO_LARGE');input+=chunk.toString('utf8');}
try{const request=JSON.parse(input),call=publicToolClient(process.env.FIRST_BELL_PUBLIC_ORIGIN??'http://localhost:3100');process.stdout.write(JSON.stringify(await preparePublicBellReview(request,call))+'\n');}catch{process.stderr.write('Read-only public Flow review unavailable. No wallet, payment or transaction was accessed.\n');process.exitCode=1;}

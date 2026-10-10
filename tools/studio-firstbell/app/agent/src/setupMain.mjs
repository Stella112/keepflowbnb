import {studioSetupDiagnostics} from './setupDiagnostics.mjs';
try{console.log(JSON.stringify(await studioSetupDiagnostics(),null,2));}
catch{console.error('STUDIO_SETUP_VALIDATION_FAILED');process.exitCode=1;}

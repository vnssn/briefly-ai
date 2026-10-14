import {SAMPLE_NOTES} from './src/brief.js';
const response=await fetch('http://127.0.0.1:5173/api/brief',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes:SAMPLE_NOTES})});
const data=await response.json();
console.log(JSON.stringify({status:response.status,error:data.error,title:data.brief?.title,actions:data.brief?.actions?.length}));

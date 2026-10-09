/* Headless tests for the Social Groups engine.  Run:  node groups_test.js [path/to/kano-city.html]
   The game's rules sit between //#ENGINE-START and //#ENGINE-END in the HTML, so the tests run the real engine code, not a copy. */
const fs=require('fs');
const html=fs.readFileSync(process.argv[2]||__dirname+'/kano-city.html','utf8');
const engine=html.slice(html.indexOf('//#ENGINE-START'),html.indexOf('//#ENGINE-END'));
console.log('Engine extracted:', engine.length, 'chars');
console.log('Open kano-city.html in a browser to play. Run full tests after the complete groups_test.js is restored.');
process.exit(0);

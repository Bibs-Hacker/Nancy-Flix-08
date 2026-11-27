/* Curated links to rights-holders' official uploads, not arbitrary Archive uploads.
 * No scraping, downloaded episodes, paid API, or additional function required. */
const catalogue = require('../kids-catalogue.json');
module.exports = async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
  if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).json({ok:false,error:'Use GET'});
  const u=new URL(req.url,'https://nancyflix.invalid');
  const cat=u.searchParams.get('cat')||'cartoons';
  const q=(u.searchParams.get('q')||'').trim().toLowerCase().slice(0,60);
  const page=Math.max(1,Number(u.searchParams.get('page'))||1);
  const matches=catalogue.filter(x=>(cat==='cartoons'||x.cats.includes(cat))&&(!q||(x.title+' '+x.desc+' '+x.source).toLowerCase().includes(q)));
  return res.status(200).json({ok:true,cat,page,total:matches.length,hasMore:false,items:page===1?matches:[]});
};


const pagination=(req,res,next)=>{
    let page=req.query.page?Number.parseInt(req.query.page):0;
    if(page<0 || isNaN(page)) page=0
  
    let size=req.query.size?Number.parseInt(req.query.size):10;
    if(size>10 || size<1 || isNaN(size)) size=10
  
    req.pagination={size,page}
    next();
  
  }

module.exports={pagination}
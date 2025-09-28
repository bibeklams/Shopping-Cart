const express=require('express');
const {MongoClient,ObjectId}=require('mongodb');
const session=require('express-session');
const app=express();
const port=3002;

const client=new MongoClient('mongodb://127.0.0.1:27017');
let productCollection;

async function run() {
  try{
    await client.connect();
    console.log('MongoDb is connected');
    const db=client.db('ShopDB');
    productCollection=db.collection('products');
  }catch(err){
    console.log(err);
  }
}
run();

app.set('view engine','ejs');
app.set('views','views');

app.use(session({
  secret:"cart-secret",
  resave:false,
  saveUninitialized:true
}));
app.use(express.urlencoded({extended:false}));


app.get('/',(req,res)=>{
  res.redirect('/products');
});
app.get('/products',async(req,res)=>{
  const product=await productCollection.find().toArray();
  res.render('products',{product:product});
});
app.get('/add-product',(req,res)=>{
  res.render('add-product');
});
app.post('/add-product',async(req,res)=>{
  const price=parseFloat(req.body.price);
  await productCollection.insertOne({name:req.body.name,price:price});
  res.redirect('/add-product');
});

app.post('/add-to-cart/:id', async (req,res)=>{
  const id = req.params.id;
  const product = await productCollection.findOne({_id:new ObjectId(id)});
  if(!req.session.cart) req.session.cart = [];

  const existing = req.session.cart.find(item => item._id.toString() === id);
  if(existing){
    existing.qty = (existing.qty || 1) + 1;
  } else {
    product.qty = 1;
    req.session.cart.push(product);
  }

  res.redirect('/');
});
app.get('/cart',(req,res)=>{
  const cart=req.session.cart||[];
  const total = cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);

  res.render('cart',{cart:cart,total:total});
});
app.post('/remove/:id',(req,res)=>{
  const id = req.params.id;
  if(req.session.cart){
    req.session.cart = req.session.cart.map(item => {
      if(item._id.toString() === id){
        item.qty = (item.qty || 1) - 1;
      }
      return item;
    }).filter(item => item.qty > 0); 
  }
  res.redirect('/cart');
});
app.listen(port,()=>{
  console.log(`server is running at http://localhost:${port}`);
})
// express, jsonwebtoken, mongoose, cors have been installed
const {upload} = require('./imgstorage');
const port = 5500;
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const path = require('path');
const cors = require('cors');


app.use(express.json());
app.use(cors());

//database connection with mongodb
mongoose.connect("mongodb+srv://swarnimkr259:skatmongoose007@cluster0.dx0lz.mongodb.net/cluster0");

// API cretion
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, (error) => {
    if (error) {
        console.log('Error running the server: ' + error);
    }
    else
    {console.log('Server is running on port', port);}
})


//creating upload endpoint for multer
app.use('/images', express.static('uploads/images'));

app.post('/upload', upload.single('image'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    });
});

//schema for creating products

const Product = mongoose.model("Product", {
    id:{
        type: Number,
        required: true
    },
    name:{
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    category:{
        type: String,
        required: true
    },
    new_price:{
        type: Number,
        required: true
    },
    old_price:{
        type: Number,
        required: true
    },
    Date:{
        type: Date,
        default: Date.now
    },
    available:{
        type: Boolean,
        default: true
    }
})

//adding product to database using the schema
app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if(products.length>0){
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    }
    else{
        id=1;
    }
    const product = new Product({
        id:id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    })
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name: req.body.name,
    })
})
//API for removing product
app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({id: req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name: req.body.name,
    })
})

//api for getting all products
app.get('/allproducts', async (req, res) => {
    const products = await Product.find();
    console.log("All products fetched");
    res.send(products);
})

//api for getting all products of a seller

// Schema for user model
const Users = mongoose.model("Users", {
    name:{
        type:String
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now
    }
})

// endpoint for user singup
app.post('/signup', async(req,res) => {
    let check = await Users.findOne({email:req.body.email});
    if (check){
        return res.status(400).json({success:false, errors:"User Already Exists"})
    }
    let cart = {};
    for (let i=0; i<300; i++){
        cart[i] = 0;
    }
    const user = new Users({
        name: req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart
    })

    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data, 'secret_ecom');
    res.json({success:true, token});
})


// endpoint for user login
app.post('/login', async (req, res) => {
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({success:true, token});
        }
        else{
            res.json({success:false, errors:"Wrong Password"});
        }
    }
    else{
        res.json({success:false, errors:"Wrong Email ID"});
    }
})



//endpoint for new collection data

app.get('/newcollection', async (req, res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);
})
    //not working in thunder client

// Endpoint to search products by name and category
app.get('/searchproducts', async (req, res) => {
    try {
        const { name, category } = req.query;
    
        let searchQuery = {};
        if (name) {
            searchQuery.name = { $regex: name, $options: 'i' };
        }
        if (category) {
            searchQuery.category = { $regex: category, $options: 'i' };
        }

        const products = await Product.find(searchQuery);

        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, errors: "Internal Server Error" });
    }
});

// Endpoint to get the most popular products
app.get('/mostpopular', async (req, res) => {
    try {
        const users = await Users.find();

        //map to store product popularity
        const productPopularity = {};

        users.forEach(user => {
            const cartData = user.cartData;
            for (const productId in cartData) {
                if (cartData.hasOwnProperty(productId)) {
                    if (!productPopularity[productId]) {
                        productPopularity[productId] = 0;
                    }
                    productPopularity[productId] += cartData[productId];
                }
            }
        });

        const popularProductsArray = Object.entries(productPopularity);

        popularProductsArray.sort((a, b) => b[1] - a[1]);

        const topN = 10;
        const topPopularProducts = popularProductsArray.slice(0, topN);

        const popularProducts = await Product.find({
            id: { $in: topPopularProducts.map(item => item[0]) }
        });

        res.json(popularProducts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, errors: "Internal Server Error" });
    }
});

//middleware for fetching user
const fetchUser = async(req,res,next) => {
    const token = req.header('auth-token');
    if(!token){
        req.status(401).send({errors: "Please authenticate using valid token"});
    }
    else{
        try{
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next();
        }
        catch (error){

        }
    }
}

//endpoint for add to cart
app.post('/addtocart', fetchUser, async(req,res)=>{
    console.log("Added", req.body.itemId);
    let userData = await Users.findOne({id: req.user.id});
    userData.cartData[req.body.ItemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added");
})

//endpoint to remove from cart
app.post('/removefromcart'), fetchUser, async(req,res)=>{
    console.log("Removed", req.body.itemId);
    let userData = await Users.findOne({id: req.user.id});
    if(userData.cartData[req.body.itemId>0]);
    userData.cartData[req.body.ItemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added");
}

//endpoint to get cartdata
app.post('/getcart', fetchUser, async(req,res) => {
    console.log("Get Cart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})


// Seller schema
const Sellers = mongoose.model("Sellers", {
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    date: {
        type:Date,
        default: Date.now
    },
    craft: {
        type: String,
        required: true
    }
})

//signup endpoint for seller
app.post('/seller/signup', async(req,res) => {
    let check = await Sellers.findOne({email:req.body.email});
    if (check){
        return res.status(400).json({success:false, errors:"Seller with email already exists"})
    }
    let cart = {};
    for (let i=0; i<300; i++){
        cart[i] = 0;
    }
    const seller = new Sellers({
        name: req.body.name,
        email:req.body.email,
        password:req.body.password,
        craft: req.body.craft
    })
    console.log(seller);
    await seller.save();

    const data = {
        seller:{
            id:seller.id
        }
    }
    const token = jwt.sign(data, 'secret_ecom');
    res.json({success:true, token});
})

//login endpoint for seller
app.post('/seller/login', async (req, res) => {
    let seller = await Sellers.findOne({email:req.body.email});
    if(seller){
        const passCompare = req.body.password === seller.password;
        if(passCompare){
            const data = {
                seller:{
                    id:seller.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({success:true, token});
        }else{
            res.status(400).json({success:false, errors:"Invalid Password"})
        }
    }else{
        res.status(400).json({success:false, errors:"Seller with this email not found"})
    }
})

//fetchSeller function
const fetchSeller = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token){
        return res.status(401).json({success:false, errors:"Access Denied"})
    }
    try{
        const verified = jwt.verify(token, 'secret_ecom');
        req.seller = verified.seller;
        next();
    }catch(err){
        res.status(400).json({success:false, errors:"Invalid Token"})
    }
}
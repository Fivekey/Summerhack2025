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
        name: req.body.username,
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
if (process.env.NODE_ENV !== 'Production') {
    require('dotenv').config();
}

console.log(process.env.SECRET);
console.log(process.env.API_KEY);



const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const Cart = require('./models/cart.js')
const Orders = require('./models/oredrs.js')
const path = require('path');
const ejsmate = require('ejs-mate');
const ExpressError = require('./utilities/ExpressError')
const catchAsync = require('./utilities/catchAsync')
const joi = require('joi');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const flash = require('connect-flash')
const FormData = require('form-data');
const { instance } = require('./RAZORPAY');
const { createHmac } = require('node:crypto')
const MongoStore = require("connect-mongo");





const multer = require('multer')
const { storage } = require('./CLOUDINARY')

const upload = multer({ storage })

const Product = require('./models/product.js');
const { Console } = require('console');
const { isLoggedin } = require('./middleware.js');
const { publicDecrypt } = require('crypto');
const { createBrotliDecompress } = require('zlib');
const { resolve } = require('path');

const dburl =process.env.DB_URL || 'mongodb://localhost:27017/Electromart'
// ||'mongodb://localhost:27017/Electromart'

mongoose.connect(dburl, { useNewUrlParser: true, useUnifiedTopology: true, })
    .then(() => {
        console.log(" mongo connection open")
    })
    .catch((error) => {
        console.log(" mongo connection error");
        console.log(error)
    })

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))
app.engine('ejs', ejsmate)
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())


const secret = process.env.SECRET || 'thisshouldbeabettersecret!'
const store = MongoStore.create({
    mongoUrl: dburl,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: secret
    }
});

store.on("error", function (e) {
    console.log("session store error", e);
})

const sessionConfig = {

    name: 'session',
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure:true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }

}



app.use(session(sessionConfig))
app.use(flash());




app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {

    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success")
    res.locals.error = req.flash("error")
    next();
})




app.get('/electro', async (req, res) => {
    const items = await Product.find({})
    res.render('./Product/home.ejs', { items })
})






app.get('/electro/cart', isLoggedin, (req, res) => {
    console.log(req.session.returnTo)

    res.render('./Product/cart.ejs')

})

app.get('/electro/:id/addcart', isLoggedin, async (req, res) => {
    const { id } = req.params
    const product = await Product.findById(id)
    const carts = await Cart.findOne({ Author: req.user._id })
    const cartprod = await Cart.findOne({ Products: product._id })



    if (carts) {

        const existingproductIndex = carts.Product.findIndex(Product => new String(Product.item).trim() == new String(product._id).trim());


        // console.log(carts.Product[0].item)

        if (existingproductIndex >= 0) {
            // console.log(existingproductIndex)
            const existingproduct = carts.Product[existingproductIndex];
            existingproduct.quantity += 1;
            carts.TotalPrice += product.price
            carts.save();
            //    console.log("product already exists")
        } else {
            // console.log(product._id)
            // console.log(carts.Product)
            carts.Product.push({ item: product._id, quantity: 1 })
            carts.TotalPrice += product.price;
            carts.save()

        }


    } else {
        const newcart = new Cart({
            Author: req.user._id,
            Product: [{ item: product._id, quantity: 1 }],
            TotalPrice: product.price
        })
        await newcart.save();
    }




    res.redirect(`/electro/${id}/view`)



})




app.get('/orderplaced', (req, res) => {
    res.render('./Product/orderplaced.ejs')
})

app.get('/placeorder', isLoggedin, async (req, res) => {
    const carts = await Cart.findOne({ Author: req.user._id })
    const TotalPrice = carts.TotalPrice
    res.render('./Product/checkout.ejs', { TotalPrice })
})


app.post('/changequantity', async (req, res) => {
    const { ProductId, userId } = req.body;
    const product = await Product.findById(ProductId);
    const cart = await Cart.findOne({ Author: userId });
    const ProductIndex = await cart.Product.findIndex(product => new String(product.item).trim() == new String(ProductId).trim());
    const incrP = cart.Product[ProductIndex].quantity += 1;
    cart.TotalPrice += product.price
    cart.save();
    res.json(req.body)




})

app.post('/decrquantity', async (req, res) => {
    const { ProductId, userId, quantity } = req.body;
    const product = await Product.findById(ProductId);
    const cart = await Cart.findOne({ Author: userId });
    const ProductIndex = await cart.Product.findIndex(product => new String(product.item).trim() == new String(ProductId).trim());
    const productQ = parseInt(quantity);

    res.json(req.body)
    if (productQ > 1) {
        cart.Product[ProductIndex].quantity -= 1;
        cart.TotalPrice -= product.price
        cart.save();
    }



    // if (productQ == 1) {
    //     if (cart.Product.length === 1) {
    //         await cart.deleteOne({ Author: userId })
    //      } else {

    //         await cart.updateOne({ $pull: { Product: { item: ProductId } } })
    //     }
    //     cart.save();
    //     res.json(req.body)


    // } else {

    //     cart.Product[ProductIndex].quantity -= 1;
    //     cart.TotalPrice -= product.price
    //     cart.save();


    // }

})

app.get('/electro/cart/:userid', async (req, res) => {
    const { userid } = req.params;


    try {
        const product = await Cart.findOne({ Author: userid.toString() }).populate("Product.item").populate('Author')



        if (product !== null) {
            const prod = product.Product

            res.render('./Product/cart.ejs', { product, prod });
        } else {
            res.render('./Product/emptycart.ejs')
        }
    } catch (err) {
        console.log(err)
    }
})

app.post('/checkout-order', async (req, res) => {
    const { Address, Pincode, Mobileno, TotalAmount, userId } = req.body

    const cart = await Cart.findOne({ Author: req.body.userId });
    let status = req.body['PAYMENT-METHOD'] === 'COD' ? 'placed-successfully' : 'Pending'
    // console.log(cart.Product)


    const orderDetails = new Orders({
        Address: Address,
        Pincode: Pincode,
        MobileNo: Mobileno,
        Products: cart.Product,
        PaymentMethod: req.body['PAYMENT-METHOD'],
        UserId: userId,
        TotalAmount: TotalAmount,
        Status: status,
        Date: new Date(),

    })
    await orderDetails.save()
    const order = await Orders.find({ UserId: userId })
    const length = order.length;
    const orderid = order[length - 1];




    if (req.body['PAYMENT-METHOD'] === 'COD') {
        await cart.remove({ "Author": req.body.userId })
        res.json(req.body)
    } else {
        var options = {
            amount: orderid.TotalAmount * 100,
            currency: "INR",
            receipt: orderid._id.toString(),
            notes: {
                key1: "value3",
                key2: "value2"
            }
        }
        instance.orders.create(options, function (err, order) {

            res.json(order)
        })
    }

})

app.post('/verify-payment', async (req, res) => {
    const { response, order } = req.body;
    const cart = await Cart.findOne({ Author: req.user._id });

    // console.log(response.razorpay_signature)
    // console.log(response.razorpay_payment_id);
    // console.log(order.data.id)


    let serversignature = createHmac('sha256', "kHy07RFpREaeuGyxwNe73Tuf")
    serversignature.update(order.data.id + '|' + response.razorpay_payment_id);
    const hmac = serversignature.digest('hex')
    // console.log(hmac);
    if (hmac === response.razorpay_signature) {
        console.log("payment success")
        await Orders.findByIdAndUpdate({ _id: order.data.receipt }, { $set: { Status: "Placed successfully" } });
        await cart.remove({ "Author": req.user._id })
        res.json({ status: "placed successfully" })
    } else {
        console.log("payment failed")
        res.json({ status: "payment failed" })
    }
})

app.post('/electro/delete/cart', async (req, res) => {
    const { authorid, itemid, price } = req.body;
    //   console.log(authorid,itemid)
    const cart = await Cart.findOne({ Author: authorid });
    //   console.log(cart.Product.length)
    if (cart.Product.length > 1) {
        const carts = await Cart.updateOne({ 'Author': authorid }, { $pull: { Product: { "item": itemid } } });
        cart.TotalPrice -= price;
        cart.save()

    } else {
        await cart.deleteOne({ Author: authorid })
    }



    res.json(req.body)
})


// db.mycollection.update(
//     { '_id': ObjectId("5150a1199fac0e6910000002") }, 
//     { $pull: { items: { id: 23 } } },
//     false, // Upsert
//     true, // Multi
// );

app.get('/orders', isLoggedin, async (req, res) => {
    const order = await Orders.find({ UserId: req.user._id }).populate({ path: 'Products', populate: { path: 'item', model: 'Product' } })
    // console.log(order)   
    // console.log(order.Products)       

    res.render('./Product/orders.ejs', { order })
})

app.post('/searchitems', async (req, res) => {
    let data = req.body.data.toString().trim();
    const search = await Product.find({ name: { $regex: new RegExp('^' + data + '.*', 'i') } }).exec();

    res.json(search)
})





app.post('/test', async (req, res) => {
    res.json(req.body)
})

app.get('/test', async (req, res) => {
    res.render('./Product/test.ejs')
})





app.get('/electro/:id/view', async (req, res) => {
    const { id } = req.params

    const products = await Product.findById(id);

    const category = products.category
    // console.log(category);
    const manyproducts = await Product.find({ category: category })

    res.render('./Product/viewundercategory.ejs', { manyproducts })


})


app.post('/displaysearch', async (req, res) => {
    let data = req.body.data.toString().trim();
    const search = await Product.find({ name: { $regex: new RegExp('^' + data + '.*', 'i') } }).exec();
    res.json(search)
})

app.get('/electro/:id/edit', async (req, res) => {
    const { id } = req.params;
    const items = await Product.findById(id)
    res.render('./Product/editProduct.ejs', { items, id })
    // console.log(items)

})

app.put('/electro/:id', upload.array('img'), async (req, res) => {
    const { id } = req.params
    // console.log(id)
    const updateitem = await Product.findByIdAndUpdate(id, { ...req.body })
    await updateitem.save();
    // console.log(updateitem)
    res.redirect(`/electro/${updateitem._id}/view`)


})

// app.delete('/electro/:id/delete', async (req, res) => {
//     const { id } = req.params
//     const deleteproduct = await Product.findByIdAndDelete(id)
//     res.redirect('/electro')
// })

app.get('/lecetrocart/id')



app.get('/electro/addproduct', (req, res) => {
    res.render('./product/addproduct.ejs')
})





app.get('/electro/:id', catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const item = await Product.findById(id);
    if (!item) {
        throw new ExpressError("product not found", 404)
    } else {

        res.render('./Product/show.ejs', { item })
    }
}))


app.get('/logout', (req, res,) => {
    req.logout()

    req.flash('success', 'successfuly loggedOut')
    res.redirect('/electro');
});




app.get('/signin', (req, res) => {
    res.render('./authentication/signin')
})

app.post('/signin', catchAsync(async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ email, username });
        const registereduser = await User.register(user, password)
        req.login(registereduser, err => {
            if (err) return next(err)
            req.flash("success", "Welcome to ElectroMart");
            res.redirect('/electro');

        })
        console.log(registereduser);

    } catch (e) {
        req.flash("error", e.message);
        res.redirect('/signin')
    }
}))

app.get('/login', (req, res) => {
    res.render('./authentication/login')
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), async (req, res, next) => {

    req.flash('success', "logIn successfull")
    const redirecturl = req.session.returnTo || '/electro'
    res.redirect(redirecturl)





})







app.post('/electro/addproduct', upload.array('img'), catchAsync(async (req, res, next) => {

    const product = await new Product(req.body);
    product.img = req.files.map(f => ({ url: f.path, filename: f.filename }))

    await product.save()


    // console.log(product);
    // const product=await Product(input)
    // await product.save()
    // console.log(product);

    res.send("worked");


}))

app.all('*', (req, res, next) => {
    next(new ExpressError("something went wrong ", 404))

})

app.use((err, req, res, next) => {
    const { statuscode = 500 } = err;
    if (!err.message) err.message = "somenthing went wrong"
    res.status(statuscode).render('error.ejs', { err })
})






app.listen(3000, () => {
    console.log("listening port 3000 for electromart")
})




require("dotenv").config();
const express = require("express")
const bodyParser = require("body-parser");
const _ = require("lodash");
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate =  require("mongoose-findorcreate");
let login = false;
let orderPlaced = false;
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(express.static("public"))
app.use(session({
  secret: "secret is here",
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DATABASE_NAME);

const pizzaSchema = {
  title: String,
  discription: String,
  img: String,
  price: {
    regular: String,
    medium: String,
    large: String
  },
  bestseller: Boolean
}
const Pizza = mongoose.model("PizzaInfo", pizzaSchema)

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema)

const orderSchema = {
  user_id: String,
  pizza_id: String,
  quantity: Number,
  size: String,
}
const Order = mongoose.model("Order", orderSchema);

const userOrderSchema = {
  user_id: String,
  orders: Array
}
const Userorder = mongoose.model("Userorder", userOrderSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});
passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/pizza",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
    Userorder.findOne({user_id:user._id}, function(err, foundUserorder){
      if(!foundUserorder){
        const userorder = new Userorder({
            user_id: user._id,
            orders: []
        })
        userorder.save()
      }
    })
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  if(req.isAuthenticated()){
    login = true;
  }
   Pizza.find({}, function(err, foundItems) {
    if (err) {
      console.log(err)
    } else {
      res.render("landing", {
        listItems: foundItems,
        login: login
      });
    }
  })
})

app.get("/menu", function(req, res) {
  if(req.isAuthenticated()){
    login = true;
  }
  Pizza.find({}, function(err, foundItems) {
    if (err) {
      console.log(err)
    } else {
      res.render("menu", {
        listItems: foundItems,
        login: login
      });
    }
  })
})

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/pizza",
 passport.authenticate("google",
 {failureRedirect: "/loginfail", failureMessage:true, successRedirect: "/menu"}))

app.get("/login", function(req, res) {
  if(req.isAuthenticated()){
    login = true;
  }
  if(!login){
    res.render("login", {
      login_err: "",
      login: login
    });
  }else{
    res.redirect("/")
  }
})

app.get("/loginfail", function(req, res){
  if(req.session.messages){
      return res.render("login",{login_err:req.session.messages, login: login});
  }else{
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout(function(err){
    if(err){return next(err)};
    login = false;
    res.redirect("/");
  });
});

app.post("/login", passport.authenticate("local",
{failureRedirect: '/loginfail', failureMessage:true, successRedirect: "/menu"}))


app.get("/signup", function(req, res) {
  if(req.isAuthenticated()){
    login = true;
  }
  if(!login){
    res.render("signup", {login: login});
  }else{
    res.redirect("/")
  }
})

app.post("/signup", function(req, res) {
  if (req.body.password === req.body.confirm_password) {
    User.register({
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("/signup")
      } else {
        passport.authenticate("local")(req, res, function() {
          Userorder.findOne({user_id:req.user.id}, function(err, foundUserorder){
            if(!foundUserorder){
              const userorder = new Userorder({
                  user_id: user._id,
                  orders: []
              })
              userorder.save()
            }
          })
          res.redirect("/menu")
        })
      }
    })
  }
});

async function renderPage(req, res, promises){
  var arrayOfValues = await Promise.all(promises)
  return res.render("orders",{Orderlist: arrayOfValues, login:login})
}

app.get("/orders", function(req, res, next) {
  if (req.isAuthenticated()) {
    var OrderPizzaList = [];
    login = true;
    Order.find({user_id: req.user.id})
    .then((foundOrders)=>{
      var promises =  foundOrders.map((order)=>{
          return Pizza.findById(order.pizza_id)
          .then((pizza)=>{
            let obj = {};
            let price = (order.quantity)*(parseFloat(pizza.price[order.size]));
            obj.title = pizza.title;
            obj.discription = pizza.discription;
            obj.img = pizza.img;
            obj.Size = order.size;
            obj.Quantity = order.quantity;
            obj.totalPrice = price;
            obj.order_id = order._id;
            return obj;
          })
        })
      renderPage(req, res, promises)
  })
  } else {
    res.redirect("/login");
  }
})

app.get("/orders/delete/:id", function(req, res){
  Order.deleteOne({_id:req.params.id}, function(err) {
      if (!err) {
        res.redirect("/orders");
      } else {
        res.send(err);
      }
})
Userorder.updateOne({user_id: req.user.id},{$pull: {orders: req.params.id}}, function(err){
  if(err){
    console.log(err)
  }else{
    console.log("success")
  }
})
})


app.route("/pizzaPage/:id")
.get(function(req, res){

  Pizza.findById(req.params.id , function(err, foundPizza){
    if(foundPizza){
      res.render("pizzaPage",{pizzaItem: foundPizza, login:login, orderPlaced: orderPlaced})
      orderPlaced = false;
    }else{
      res.send("No Pizza found")
    }
  })
})
.post(function(req, res){
  if(req.isAuthenticated()){
    const order = new Order({
      user_id: req.user.id,
      pizza_id: req.params.id,
      quantity: req.body.Quantity,
      size: req.body.Size
    })
    order.save();
    Userorder.findOneAndUpdate({user_id: req.user.id},{$push: {orders: order._id.toString()}}, function(err){
      if(err){
        console.log(err)
      }else{
        orderPlaced = true;
        Pizza.findById(req.params.id , function(err, foundPizza){
          if(foundPizza){
            res.render("pizzaPage",{pizzaItem: foundPizza, login:login, orderPlaced: orderPlaced})
            orderPlaced = false;
          }else{
            res.send("No Pizza found")
          }
        })
      }
    })
  }
});


app.listen(3000, function() {
  console.log("Server started on port 3000")
})

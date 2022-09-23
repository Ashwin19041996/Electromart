const express=require('express');
const app=express();
const mongoose=require('mongoose');
const methodoverride=require('method-override');
const Cart=require('../models/cart.js')
const path=require('path');
const ejsmate=require('ejs-mate');

const Product=require('../models/product.js')


mongoose.connect('mongodb://localhost:27017/Electromart', {useNewUrlParser: true, useUnifiedTopology: true,})
.then(()=>{
    console.log(" mongo connection open")
    })
   .catch((error)=>{
  console.log(" mongo connection error");
  console.log(error)
  })

  Product.insertMany(
    [
        {name:"Home Thaetres", img:"https://media.istockphoto.com/photos/two-sound-speakers-in-neon-light-with-sound-wave-picture-id1327123770?b=1&k=20&m=1327123770&s=170667a&w=0&h=ZkxN12Vuac11s8JYG9w30vbp8dyst0jdH82_xtPGeMM=",price: 342,description:"loremhwhfgew" },
        {name:"Televisions" ,img:"https://image.cnbcfm.com/api/v1/image/105662117-1546807112813screenshot2019-01-06at12.35.15pm.png?v=1546807242&w=1920&h=1080",price:33,description:"hfwhgeiy"},
        {name:"Iphone 11Pro" ,img:"https://images.macrumors.com/article-new/2021/09/Apple-iPhone-13-colors-lineup-2022.jpg",price:33,description:"hfwhgeiy"},
        {name:"Kitchen Appliances" ,img:"https://imageio.forbes.com/specials-images/imageserve/615b7a2d10f14c6d90c57d56/Small-appliances-on-a-kitchen-countertop-/960x0.jpg?format=jpg&width=960",price:33,description:"hfwhgeiy"}
    ]
  )
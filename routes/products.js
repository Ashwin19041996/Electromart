const express=require(express);
const router=express.router();
const Product=require('../models/product.js');
const ExpressError=require('../utilities/ExpressError')
const catchAsync=require('../utilities/catchAsync')
const flash=require('connect-flash')
const multer  = require('multer')
const {storage}=require('../CLOUDINARY')

const upload = multer({ storage })
const { isLoggedin } = require('../middleware.js');




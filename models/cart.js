const express=require('express');
const mongoose=require('mongoose');
const  Product=require('./product');
const cartSchema=new mongoose.Schema({
    Author:{
type:mongoose.Schema.Types.ObjectId,
ref:'User'
    },

    Product:[{
         item:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Product'
         },
         quantity:{
            type:Number,
            required:true
         }
          
         }],
    
     
        // Product:[{
        //     type:mongoose.Schema.Types.ObjectId,
        //     ref:'Product',
            
        // }],
     
    
TotalPrice:Number

   
   

   
})

module.exports=mongoose.model('Cart',cartSchema);
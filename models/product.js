const mongoose=require('mongoose');
const express=require('express');
const productSchema= new mongoose.Schema({
   name:{
        type: String,
        required:true
   },
    category:{
           type:String,
           required:true
    },
    img:[{
        url:String,
        filename:{
            type:String,
            required:true
        }
        
        


}],
    price:{
           type:Number,
           required:true
    },
    description:{
             type:String,
             required:true
    }

})

const Product=mongoose.model('Product',productSchema);

module.exports=Product;
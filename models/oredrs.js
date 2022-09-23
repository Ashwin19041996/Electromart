const mongoose=require('mongoose');
const orderSchema=new mongoose.Schema({
   Address:String,
   MobileNo:String,
   Pincode:String,
    Products:{},
 UserId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User'
 },
 PaymentMethod:String,
 TotalAmount:Number,
 Status:String,
 Date:String

})

module.exports=mongoose.model('Orders',orderSchema);
import mongoose,{Schema} from "mongoose";


const ticketSchema=new Schema(
    {
title:{
    type:String},

description:{
type:String,
},


status:{
    type:String,
    default:"todo",
   
},
createdBy:{
    type:Schema.Types.ObjectId,
    ref:"User"
},
assignedTo:{
    type:Schema.Types.ObjectId,
    ref:"User",
    default:null
},
priority:String,
deadline:Date,
helpfulNotes:String,
relatedSkills:[String]
   },
   
    {
timestamps:true
    }
)

const Ticket= mongoose.model("Ticket",ticketSchema);
export default Ticket;
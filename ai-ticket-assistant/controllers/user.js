import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken";
import User from "../models/user.model.js"
import { inngest } from '../inngest/client.js'




export const signup=async(req,res)=>{
    const {email,password,skills=[]}=req.body;

    try {
        const hashedPassowrd=await bcrypt.hash(password,10);
   const user=await User.create({email,password:hashedPassowrd,skills})
   console.log(user);

      // fire inngest events
      await inngest.send({
        name:"user/signup",
        data:{
            email
        }
      })

    const token=  jwt.sign({_id:user._id,role:user.role},process.env.JWT_SECRET);

    res.json({user,token});
    } catch (error) {
        console.error(error);
        res.status(500).json({
      message: "signup_failed",
      details: error.message,
    });
    
    }
}

export const login=async(req,res)=>{
    const {email,password}=req.body;
    console.log(req.body)


    try {
       const user= await User.findOne({email})
       console.log(user);
       if(!user){
        res.status(401).json({error:"USER NOT FOUND"});
       }
        const compare=bcrypt.compare(password,user.password);
if(!compare){
            res.status(401).json({error:"PASSWOR INCORRECT"});
}
    const token=  jwt.sign({_id:user._id,role:user.role},process.env.JWT_SECRET);

    res.json({user,token});
    } catch (error) {
        res.status(500).json({error:"login_failed",
            details:error.message})
    
    }
}


export const logout=async(req,res)=>{
   


    try {
    const token=  req.headers.authorization.split("")[1];

    if(!token){
         response.status(401).json({error:"Unauthorized",})
    }

    jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
        if(err) return    response.status(401).json({error:"Unauthorized",})
    })
res.json({message:"User loggedOut Successfully"});
   
      



    } catch (error) {
        res.status(500).json({error:"logout_failed",
            details:error.message})
    
    }
}

export const updateUser=async(req,res)=>
{
    const {skills=[],role,email}=req.body
try {
    if(req.user?.role!=="admin"){
        return res.status(403).json({error:forbidden});
    }
    const user=await User.findOne({email});
    if(!user)res.staus(401).
    json({error:"user not found"});

    await User.updateOne(
    {email},
    {skills:skills.length?skills:user.skills,role}

    )
    return res.json({message:"User updated Successfully"});
} catch (error) {
      res.status(500).json({error:"update_failed",
            details:error.message})
}
}


export const getUser=async(req,res)=>
{
try {
    if(req.user?.role!=="admin"){
        return res.status(403).json({error:forbidden});
    }
    const users=await User.find().select("-password");
    console.log(users)
    return res.json(users);
} catch (error) {
      res.status(500).json({error:"users_not_found",
            details:error.message})
}
}




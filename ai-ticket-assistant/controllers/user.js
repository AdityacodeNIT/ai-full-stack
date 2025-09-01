import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken";
import User from "../models/user.model.js"
import { inngest } from '../inngest/client.js'




export const signup = async (req, res) => {
  let { email, password, skills = [] } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Ensure skills are in correct object format
    skills = skills.map(skill =>
      typeof skill === "string"
        ? { name: skill, proficiency: 1 } // Default proficiency for new skills
        : skill
    );

    const user = await User.create({
      email,
      password: hashedPassword,
      skills
    });

    console.log(user);

    await inngest.send({
      name: "user/signup",
      data: { email }
    });

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "signup_failed",
      details: error.message,
    });
  }
};


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
export const updateUser = async (req, res) => {
  let { skills = [], role, email } = req.body;

  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "user not found" });
    }

    // Ensure skills are stored in correct object format
    skills = skills.map(skill =>
      typeof skill === "string"
        ? { name: skill, proficiency: 1 } // Default proficiency for new skills
        : skill
    );

    await User.updateOne(
      { email },
      {
        skills: skills.length ? skills : user.skills,
        role: role ?? user.role
      }
    );

    return res.json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({
      error: "update_failed",
      details: error.message
    });
  }
};



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

import express from "express"
import jwt from "jsonwebtoken";
import { getUser, login, logout, signup, updateUser } from "../controllers/user.js";
import { authenticate } from "../middleware/auth.js";

const router=express.Router();

router.post("/signup",signup)

router.post("/login",login);
router.post("/logout",logout);
router.get("/me",authenticate,(req,res)=>{
  res.json({user: req.user, authenticated: true});
});

router.get("/ws-token",authenticate,(req,res)=>{
  // Generate a temporary token for WebSocket connections
  const token = jwt.sign(
    { _id: req.user._id, role: req.user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' } // Short-lived token for WebSocket
  );
  res.json({token});
});
router.post("/updateUser",authenticate,updateUser);
router.get("/getusers",authenticate,getUser);









export default router;
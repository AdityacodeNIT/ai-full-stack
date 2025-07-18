import express from "express"
import { getUser, login, logout, signup, updateUser } from "../controllers/user.js";
import { authenticate } from "../middleware/auth.js";

const router=express.Router();

router.post("/signup",signup)

router.post("/login",login);
router.post("/logout",logout);
router.post("/updateUser",authenticate,updateUser);
router.get("/getusers",authenticate,getUser);









export default router;
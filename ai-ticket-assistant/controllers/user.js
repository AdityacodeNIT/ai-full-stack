import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken";
import User from "../models/user.model.js"
import { inngest } from '../inngest/client.js'

export const signup = async (req, res) => {
  let { email, password, skills = [] } = req.body;

  try {
    // Ensure skills are in correct object format
    skills = skills.map(skill =>
      typeof skill === "string"
        ? { name: skill, proficiency: 1 }
        : skill
    );

    // 🔥 DO NOT HASH HERE
    const user = await User.create({
      email,
      password, // plain password → model will hash it
      skills
    });

    await inngest.send({
      name: "user/signup",
      data: { email }
    });

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Remove password before sending response
    const userResponse = user.toObject();
    delete userResponse.password;

    if (process.env.NODE_ENV === "production") {
      return res.status(201).json({
        user: userResponse,
        token,
        message: "Signup successful",
      });
    }

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: userResponse,
      message: "Signup successful",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "signup_failed",
      details: error.message,
    });
  }
};



export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.status(200).json({ message: "Login successful" });
};


export const logout = async (req, res) => {
  try {
    // Clear the HTTP-only cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });

    res.json({ message: "User logged out successfully" });
  } catch (error) {
    res.status(500).json({
      error: "logout_failed",
      details: error.message
    })
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



export const getUser = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: forbidden });
    }
    const users = await User.find().select("-password");
    console.log(users)
    return res.json(users);
  } catch (error) {
    res.status(500).json({
      error: "users_not_found",
      details: error.message
    })
  }
}

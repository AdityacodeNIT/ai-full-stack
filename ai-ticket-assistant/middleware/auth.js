import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  let token;

  // Check Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token in header, check cookies
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Access denied: No token found" });
  }

  try {
    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decodedInfo);
    req.user = decodedInfo;
    next();
  } catch (error) {
    return res.status(401).json({ message: "UNAUTHORIZED_USER" });
  }
};

import { getAuth } from "@clerk/express"

export const attachUserId=(req,res,next)=>{
    const {userId}=getAuth(req);
      if (!userId) {
    return next(new ApiError(401, "Unauthorized"));
  }
  req.clerkUserId=userId;
  next();
}
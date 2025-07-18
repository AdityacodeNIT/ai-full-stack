import express from "express"
import mongoose from "mongoose"
import dotenv from "dotenv"


import cors from "cors"
import userRoutes from "./routes/user.js"
import TicketRoutes from "./routes/ticket.js"
import interviewRoutes from "./routes/interview.js"
import { serve } from "inngest/express"
import { inngest } from "./inngest/client.js"
import { onUserSignup } from "./inngest/function/on-signup.js"
import { onTicketCreated } from "./inngest/function/on-ticket-create.js"

dotenv.config()


const app=express();

app.use(cors({
  origin: 'http://localhost:5173', // set correct origins
//   credentials: true, // if using cookies
}));
app.use(express.json())

app.use("/api/inngest",
    serve(
        {client:inngest,
            functions:[onUserSignup,onTicketCreated]
        })
);

app.use("/api/auth",userRoutes)
app.use("/ticket",TicketRoutes)
app.use("/interview",interviewRoutes)

const PORT = process.env.PORT || 3000;

mongoose
.connect(process.env.MONGO_URI)
.then(()=>{
    console.log("mongo db connected")
 

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});

})

.catch((err)=>{
    console.error("❌ Mongo db connection error")
})
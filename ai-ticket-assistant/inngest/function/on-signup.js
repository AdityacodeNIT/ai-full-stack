import { inngest } from "../client.js";
import User from "../../models/user.model.js"
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";




export const onUserSignup=inngest.createFunction(

    {id:"on-user-signup",retries:2},
    {event:"user/signup"},
    async({event,step})=>{
        try {
        const{email}=event.data;

      const user=  await step.run("get-user-email",async()=>{
            const userObj=await User.findOne({email});
            if(!userObj){
                throw new NonRetriableError("user no longer exosts")
            }
            return userObj;

        
        })

        await step.run("send-welcome-email",async()=>{
            const subject=`welcome to the app`
            const message=`Hi,
            \n\n
            Thanks for signing up , We are glad to have you onboard!`

            await sendMail(user.email,subject,message)

        })
        return {suceess:true}
        } catch (error) {
            console.error("❌ error running step",error.message)
            throw new Error;
        }
    }
)

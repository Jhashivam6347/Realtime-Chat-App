import { toast } from "react-toastify";
import ContactForm from "../components/ContactForm";
import { apiRequest } from "../lib/api";

export default function Contact(){
     async function handlecontactform(formData)
        {
            try {
            await apiRequest("/contact",{
                method:"post",
                headers:{
                    "content-type":"application/json"
                },
                body:JSON.stringify(formData)
            });

            toast.success("Message sent successfully");

        } catch (err) {
            console.error(err);
            toast.error(err.message || "Server not reachable");
        }
    }

    return (
    
       <ContactForm onSubmit={handlecontactform}/>
    
    )
}
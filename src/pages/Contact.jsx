import { toast } from "react-toastify";
import ContactForm from "../components/ContactForm";

export default function Contact(){
     async function handlecontactform(formData)
        {
            try {
            const resp = await fetch(`${import.meta.env.VITE_API_URL}/contact`,{
                method:"post",
                headers:{
                    "content-type":"application/json"
                },
                body:JSON.stringify(formData)
            });

            const data = await resp.json();

            if(resp.ok){
                toast.success("Message sent successfully");
            }
            else{
                toast.error(data.msg || "Message sending failed");
            }

        } catch (err) {
            console.error(err);
            alert("Server not reachable");
        }
    }

    return (
    
       <ContactForm onSubmit={handlecontactform}/>
    
    )
}
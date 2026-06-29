import { useState } from "react";

export default function ContactForm({ onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    comment: "",
  });
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault(); // 🔥 stop page reload
    onSubmit(form);
    setForm({ name: "", email: "", phone: "", address: "", comment: "" }); // 🔥 send data to parent
  }
  return (
    <div className="contact-form auth-container app-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2 className="auth-title">Contact Us</h2>
        <label htmlFor="name" className="auth-label">
          Name:
        </label>
        <input type="text" id="name" name="name" placeholder="Enter Name" onChange={handleChange}   value={form.name} required/>

        <label htmlFor="email" className="auth-label">
          Email:
        </label>
        <input type="email" id="email" name="email" placeholder="Enter Email" onChange={handleChange}   value={form.email} required/>

        <label htmlFor="phone" className="auth-label">
          Phone:
        </label>
        <input type="tel" id="phone" name="phone" placeholder="Enter Phone" onChange={handleChange}   value={form.phone} required/>

        <label htmlFor="address" className="auth-label">
          Address:
        </label>
        <input
          type="text"
          id="address"
          name="address"
          placeholder="Enter Address"
          onChange={handleChange}
          value={form.address} required
        />

        <label htmlFor="comment" className="auth-label">
          Message:
        </label>
        <textarea
          id="comment"
          name="comment"
          onChange={handleChange}
          value={form.comment}
          placeholder="Enter Your Comments"
        ></textarea>
        <button type="submit" className="auth-button">
          Send Message
        </button>
      </form>
    </div>
  );
}

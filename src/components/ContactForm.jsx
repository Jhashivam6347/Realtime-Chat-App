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
    e.preventDefault();
    onSubmit(form);
    setForm({ name: "", email: "", phone: "", address: "", comment: "" });
  }
  return (
    <div className="w-full px-4 py-8 sm:px-6">
      <form className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-3xl border border-white/50 bg-white/80 p-6 text-left shadow-2xl backdrop-blur-xl sm:p-8" onSubmit={handleSubmit}>
        <h2 className="text-2xl font-bold text-slate-900">Contact Us</h2>
        {[
          ["name", "Name", "text", "Enter name"],
          ["email", "Email", "email", "Enter email"],
          ["phone", "Phone", "tel", "Enter phone"],
          ["address", "Address", "text", "Enter address"],
        ].map(([field, label, type, placeholder]) => (
          <label key={field} htmlFor={field} className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            {label}
            <input
              type={type}
              id={field}
              name={field}
              placeholder={placeholder}
              onChange={handleChange}
              value={form[field]}
              required={field !== "address"}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
            />
          </label>
        ))}
        <label htmlFor="comment" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Message
          <textarea
            id="comment"
            name="comment"
            onChange={handleChange}
            value={form.comment}
            placeholder="Enter your comments"
            required
            className="min-h-28 resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
          />
        </label>
        <button type="submit" className="rounded-xl bg-gradient-to-r from-indigo-500 via-teal-400 to-amber-300 px-4 py-3 font-semibold text-slate-950 shadow-lg transition hover:-translate-y-0.5">
          Send Message
        </button>
      </form>
    </div>
  );
}

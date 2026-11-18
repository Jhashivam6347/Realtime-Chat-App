import { useEffect, useState } from "react";
import { apiRequest, authHeaders } from "../lib/api";

function UsersTable() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    apiRequest("/userlist", { headers: authHeaders() })
      .then(setUsers)
      .catch((error) => console.error("Error fetching users:", error));
  }, []);

  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-full max-w-6xl px-4 py-8 text-slate-900 sm:px-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold">Users</h1>
          <input
            type="search"
            placeholder="Search by name or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 sm:max-w-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-slate-900 text-white">
              <tr><th className="px-5 py-3 font-semibold">Name</th><th className="px-5 py-3 font-semibold">ID</th><th className="px-5 py-3 font-semibold">Email</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="3" className="px-5 py-8 text-center text-slate-500">No users found</td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-indigo-50/60">
                  <td className="px-5 py-3 font-medium">{user.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{user._id}</td>
                  <td className="px-5 py-3">{user.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default UsersTable;

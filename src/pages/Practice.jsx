import { useEffect, useState } from "react";
 function UsersTable() {
  
  const [search, setSearch] = useState("");
  const [UsersList, setuserlist] = useState([]);
  useEffect(() => {
  const token = localStorage.getItem("token");

  fetch(`${import.meta.env.VITE_API_URL}/userlist`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(resp => resp.json())
    .then((data) => {
      console.log("API DATA:", data);
      setuserlist(data);
    })
    .catch(err => console.error("Error fetching users:", err));
}, []);

  const filter_user = UsersList.filter((user) => {
    return user.name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase());
});

  return (
    <div className="show_users_list">
      <input
        type="search"
        placeholder="Search by name or city..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <table border="1">
        <thead>
          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>Email</th>
          </tr>
        </thead>

        <tbody>
          {filter_user.length === 0 ? (
            <tr>
              <td colSpan="3" style={{ textAlign: "center" }}>No users found</td>
            </tr>
          ) : (
            filter_user.map((user, index) => (
            <tr key={index}>
              <td>{user.name}</td>
              <td>{user._id}</td>
              <td>{user.email}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}

export default UsersTable;

import "./UserCard.css";

export default function UserCard({ user, onEdit, onDelete }) {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>

      <p><strong>ID:</strong> {user._id}</p>
      <p><strong>Username:</strong> {user.username}</p>
      {user.email && <p><strong>Email:</strong> {user.email}</p>}
      {user.phone && <p><strong>Tel:</strong> {user.phone}</p>}
      <p><strong>Roli:</strong> {user.role}</p>

      <div className="user-actions">
        <button onClick={onEdit} className="edit-btn">✏️ Ndrysho</button>
        <button onClick={onDelete} className="delete-btn">🗑️ Fshi</button>
      </div>
    </div>
  );
}

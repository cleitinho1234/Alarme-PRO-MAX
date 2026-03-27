let currentUser = null;
const contacts = [];

// =========================
// Carregar usuário
window.addEventListener("load", async () => {
  let savedId = localStorage.getItem("userId");

  if (savedId) {
    const res = await fetch(`/getUser/${savedId}`);
    const user = await res.json();

    if (!user.error) {
      currentUser = user;
    } else {
      localStorage.removeItem("userId");
    }
  }

  if (!currentUser) {
    const res = await fetch("/user", { method: "POST" });
    currentUser = await res.json();
    localStorage.setItem("userId", currentUser.id);
  }

  document.getElementById("userIdDisplay").textContent = currentUser.id;
  document.getElementById("username").value = currentUser.username || "";
  document.getElementById("profilePreview").src = currentUser.photo || "";

  loadMessages();
});

// =========================
// SALVAR PERFIL
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const file = document.getElementById("profilePic").files[0];

  let photo = currentUser.photo;

  if (file) {
    const reader = new FileReader();

    reader.onload = async () => {
      photo = reader.result;

      // 🔥 MOSTRA NA HORA
      document.getElementById("profilePreview").src = photo;

      await saveProfile(username, photo);
    };

    reader.readAsDataURL(file);
  } else {
    await saveProfile(username, photo);
  }
});

async function saveProfile(username, photo) {
  const res = await fetch("/saveProfile", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      id: currentUser.id,
      username,
      photo
    })
  });

  const updatedUser = await res.json();
  currentUser = updatedUser;

  document.getElementById("username").value = currentUser.username || "";
  document.getElementById("profilePreview").src = currentUser.photo || "";
}

// =========================
// Copiar ID
document.getElementById("copyIdBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(currentUser.id);
  alert("ID copiado!");
});

// =========================
// Mensagens
document.getElementById("sendMessageBtn").addEventListener("click", async () => {
  const toId = document.getElementById("friendSelect").value;
  const text = document.getElementById("messageText").value.trim();

  if (!toId || !text) return alert("Preencha tudo");

  await fetch("/sendMessage", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      fromId: currentUser.id,
      toId,
      text
    })
  });

  document.getElementById("messageText").value = "";
  loadMessages();
});

async function loadMessages() {
  const res = await fetch(`/getMessages/${currentUser.id}`);
  const msgs = await res.json();

  const div = document.getElementById("messages");
  div.innerHTML = "";

  msgs.forEach(m => {
    const el = document.createElement("div");
    el.textContent = `${m.fromId === currentUser.id ? "Você" : m.fromId}: ${m.text}`;
    div.appendChild(el);
  });
        }
